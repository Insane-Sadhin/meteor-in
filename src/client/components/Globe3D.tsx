import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Observation, WeatherEventItem } from '../types/index.ts';
import { soundFx } from '../utils/soundEffects.ts';
import { Globe, Crosshair, RotateCw, Pause, Play, Compass, Wind, Droplets, Thermometer, ShieldAlert } from 'lucide-react';

interface Globe3DProps {
  observations: Observation[];
  activeEvents: WeatherEventItem[];
  onSelectStation?: (stationId: string) => void;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  observations,
  activeEvents,
  onSelectStation,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedStation, setSelectedStation] = useState<Observation | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [activeMetric, setActiveMetric] = useState<'temp' | 'humidity' | 'wind'>('temp');
  const [isFocusedOnIndia, setIsFocusedOnIndia] = useState<boolean>(true);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const ringsGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -1.35 }); // Focused near India
  const currentRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -1.35 });
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Convert (lat, lon) to 3D Cartesian coordinates on sphere radius R
  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  };

  // Generate tactical dark procedural Earth texture with cyber graticule
  const createGlobeTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Deep space navy-slate ocean background
    ctx.fillStyle = '#050c18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle oceanic bathymetry lines
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Latitude & Longitude Primary Graticules
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.5;
    // Parallels (every 30 deg)
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // Meridians (every 30 deg)
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Highlight Equator (0 deg)
    const eqY = 0.5 * canvas.height;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(canvas.width, eqY);
    ctx.stroke();

    // Highlight Tropic of Cancer (23.436 deg N - runs across India)
    const cancerY = ((90 - 23.436) / 180) * canvas.height;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, cancerY);
    ctx.lineTo(canvas.width, cancerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight Indian Subcontinent Territorial Zone (Lat: 8°N to 37°N, Lon: 68°E to 97°E)
    const indX1 = ((68 + 180) / 360) * canvas.width;
    const indX2 = ((97 + 180) / 360) * canvas.width;
    const indY1 = ((90 - 37) / 180) * canvas.height;
    const indY2 = ((90 - 8) / 180) * canvas.height;

    // Glowing Indian tactical sector box & contour glow
    const sectorGrad = ctx.createLinearGradient(indX1, indY1, indX2, indY2);
    sectorGrad.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
    sectorGrad.addColorStop(1, 'rgba(14, 165, 233, 0.12)');
    ctx.fillStyle = sectorGrad;
    ctx.fillRect(indX1, indY1, indX2 - indX1, indY2 - indY1);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(indX1, indY1, indX2 - indX1, indY2 - indY1);

    // Sector Label
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('INDIA MET-ZONE (IMD/NCMRWF)', indX1 + 10, indY1 + 30);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.2;
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x67e8f9, 2.5);
    sunLight.position.set(5, 4, 3);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.8);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // Globe Group
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // Base Sphere with Procedural Texture
    const RADIUS = 1.95;
    const sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    const globeTexture = createGlobeTexture();
    const sphereMat = new THREE.MeshStandardMaterial({
      map: globeTexture,
      roughness: 0.6,
      metalness: 0.3,
      emissive: new THREE.Color(0x030a16),
      emissiveIntensity: 0.8,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Outer Atmospheric Glow Halo
    const atmosphereGeo = new THREE.SphereGeometry(RADIUS * 1.08, 48, 48);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphereMesh);

    // Inner Fresnel glow ring
    const innerHaloGeo = new THREE.SphereGeometry(RADIUS * 1.02, 48, 48);
    const innerHaloMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    });
    const innerHaloMesh = new THREE.Mesh(innerHaloGeo, innerHaloMat);
    globeGroup.add(innerHaloMesh);

    // Starfield Particle Dust in Deep Space
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 40;
      starPositions[i + 1] = (Math.random() - 0.5) * 40;
      starPositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const starField = new THREE.Points(starsGeo, starMat);
    scene.add(starField);

    // Markers & Rings Groups
    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    globeGroup.add(markersGroup);

    const ringsGroup = new THREE.Group();
    ringsGroupRef.current = ringsGroup;
    globeGroup.add(ringsGroup);

    // Mouse / Touch Event Handlers for smooth 3D globe rotation
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      targetRotationRef.current.y += deltaX * 0.005;
      targetRotationRef.current.x += deltaY * 0.005;

      // Clamp vertical tilt
      targetRotationRef.current.x = Math.max(-1.2, Math.min(1.2, targetRotationRef.current.x));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onClick = (e: MouseEvent) => {
      if (!cameraRef.current || !markersGroupRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycasterRef.current.setFromCamera(mouse, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(markersGroupRef.current.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.station) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.station) {
          soundFx.playClick();
          setSelectedStation(obj.userData.station);
          if (onSelectStation) {
            onSelectStation(obj.userData.station.location_id);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z += e.deltaY * 0.003;
      cameraRef.current.position.z = Math.max(3.0, Math.min(8.0, cameraRef.current.position.z));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Window Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 550;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation towards target rotation
      if (isRotating && !isDraggingRef.current) {
        targetRotationRef.current.y += 0.0018; // Slow orbital turn
      }

      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.x = currentRotationRef.current.x;
        globeGroupRef.current.rotation.y = currentRotationRef.current.y;
      }

      // Animate active hazard/event shockwave pulse rings
      if (ringsGroupRef.current) {
        ringsGroupRef.current.children.forEach((ringMesh, idx) => {
          const scale = 1 + ((elapsedTime * 1.5 + idx * 0.4) % 1) * 1.8;
          ringMesh.scale.set(scale, scale, scale);
          const mat = (ringMesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.opacity = Math.max(0, 0.8 - (scale - 1) * 0.45);
          }
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onClick);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update 3D Station Pillars whenever observations or activeMetric changes
  useEffect(() => {
    if (!markersGroupRef.current || !ringsGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    const ringsGroup = ringsGroupRef.current;

    // Clear old children
    while (markersGroup.children.length > 0) {
      const obj = markersGroup.children[0];
      markersGroup.remove(obj);
    }
    while (ringsGroup.children.length > 0) {
      const obj = ringsGroup.children[0];
      ringsGroup.remove(obj);
    }

    const RADIUS = 1.95;

    // Color helper for temperature
    const getPillarColor = (temp: number): number => {
      if (temp < 15) return 0x38bdf8; // Ice cyan
      if (temp < 25) return 0x10b981; // Emerald green
      if (temp < 32) return 0xf59e0b; // Amber
      if (temp < 38) return 0xf97316; // Orange
      return 0xef4444; // Crimson Red
    };

    observations.forEach((station) => {
      const pos = latLonToVector3(station.latitude, station.longitude, RADIUS);

      // Value calculation
      let val = station.temperature;
      let height = 0.08 + Math.max(0.04, Math.min(0.45, (val / 45) * 0.45));
      let colorHex = getPillarColor(val);

      if (activeMetric === 'humidity') {
        height = 0.08 + (station.humidity / 100) * 0.4;
        colorHex = 0x06b6d4;
      } else if (activeMetric === 'wind') {
        height = 0.08 + (station.wind_speed / 50) * 0.4;
        colorHex = 0x8b5cf6;
      }

      // Cylinder pillar extending radially outwards from Earth center
      const pillarGeo = new THREE.CylinderGeometry(0.016, 0.024, height, 12);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      });

      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      // Position halfway up the cylinder
      const normal = pos.clone().normalize();
      pillarMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(height / 2)));
      pillarMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      // Base glowing pad
      const baseGeo = new THREE.CircleGeometry(0.04, 16);
      const baseMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.005)));
      baseMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      // Beacon tip sphere
      const beaconGeo = new THREE.SphereGeometry(0.025, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(height)));

      const stationGroup = new THREE.Group();
      stationGroup.add(pillarMesh);
      stationGroup.add(baseMesh);
      stationGroup.add(beaconMesh);
      stationGroup.userData = { station };

      markersGroup.add(stationGroup);

      // If active event or major alert at this location, add tactical pulse ring
      const hasEvent = activeEvents.some(
        e => e.city.toLowerCase() === station.city.toLowerCase() ||
             Math.abs(e.latitude - station.latitude) < 0.4
      );

      if (hasEvent || station.precipitation > 5) {
        const ringGeo = new THREE.RingGeometry(0.04, 0.07, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.015)));
        ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        ringsGroup.add(ringMesh);
      }
    });
  }, [observations, activeMetric, activeEvents]);

  // Center on India
  const centerOnIndia = () => {
    soundFx.playSwitch();
    // India is around Lat 22° N, Lon 79° E
    // phi = 90 - 22 = 68 deg -> X rotation ~0.38 rad
    // theta = 79 + 180 = 259 deg -> Y rotation ~-1.38 rad
    targetRotationRef.current = { x: 0.38, y: -1.38 };
    setIsFocusedOnIndia(true);
  };

  const toggleRotation = () => {
    soundFx.playClick();
    setIsRotating(prev => !prev);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-cyan-950/40">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-[520px] md:h-[620px] cursor-grab active:cursor-grabbing select-none"
        title="Drag to rotate globe. Scroll to zoom in/out. Click on station pillars to inspect."
      />

      {/* Top Left HUD: Tactical Orbiter Metrics */}
      <div className="absolute top-4 left-4 z-10 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-cyan-400 text-xs font-mono backdrop-blur-md shadow-lg">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider">3D Digital Earth • India Met-Orbiter</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">IMD INSAT-3D GRID</span>
        </div>
      </div>

      {/* Top Right HUD: Controls & Sound */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={centerOnIndia}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-medium transition-all shadow-md active:scale-95"
          title="Reset Camera onto Indian Subcontinent"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lock India</span>
        </button>

        <button
          onClick={toggleRotation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all shadow-md active:scale-95"
          title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
        >
          {isRotating ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Orbit Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Orbit Auto</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Left HUD: Metric Switcher */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl flex items-center gap-1 text-xs">
          <span className="text-[10px] text-slate-400 font-mono px-2 uppercase font-semibold">Pillars:</span>
          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('temp'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono transition-all ${
              activeMetric === 'temp'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-3 h-3 text-amber-400" />
            <span>Temperature</span>
          </button>

          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('humidity'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono transition-all ${
              activeMetric === 'humidity'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>Humidity</span>
          </button>

          <button
            onClick={() => { soundFx.playSwitch(); setActiveMetric('wind'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono transition-all ${
              activeMetric === 'wind'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3 h-3 text-purple-400" />
            <span>Wind</span>
          </button>
        </div>
      </div>

      {/* Selected Station Popout Badge */}
      {selectedStation && (
        <div className="absolute bottom-4 right-4 z-10 max-w-xs p-4 rounded-xl bg-slate-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Station Telemetry</div>
              <h4 className="text-base font-bold text-white tracking-wide">{selectedStation.city}</h4>
              <p className="text-xs text-slate-400">{selectedStation.state} • Lat {selectedStation.latitude.toFixed(2)}°N</p>
            </div>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/80"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Temperature</span>
              <span className="text-sm font-bold text-amber-300">{selectedStation.temperature.toFixed(1)}°C</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Condition</span>
              <span className="text-xs font-semibold text-cyan-300 truncate block">{selectedStation.weather_condition}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Humidity</span>
              <span className="text-xs font-semibold text-emerald-300">{selectedStation.humidity}%</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Wind Speed</span>
              <span className="text-xs font-semibold text-purple-300">{selectedStation.wind_speed} km/h</span>
            </div>
          </div>

          {selectedStation.precipitation > 0 && (
            <div className="mt-2.5 p-2 rounded bg-cyan-950/40 border border-cyan-800/60 flex items-center gap-2 text-xs text-cyan-300">
              <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Precipitation: <strong>{selectedStation.precipitation.toFixed(1)} mm</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Tactical Grid Corner Accents */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />
    </div>
  );
};
