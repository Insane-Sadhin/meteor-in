import React, { useState } from 'react';
import {
  X,
  Send,
  MapPin,
  Camera,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { submitCitizenReport } from '../utils/api.ts';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: any) => void;
  initialCoords?: { lat: number; lon: number } | null;
}

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCoords,
}) => {
  const [eventType, setEventType] = useState('Heavy Rain');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(initialCoords ? initialCoords.lat.toString() : '28.6139');
  const [longitude, setLongitude] = useState(initialCoords ? initialCoords.lon.toString() : '77.2090');
  const [reporterName, setReporterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Sync if initial coords change
  React.useEffect(() => {
    if (initialCoords) {
      setLatitude(initialCoords.lat.toString());
      setLongitude(initialCoords.lon.toString());
    }
  }, [initialCoords]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !locationName.trim()) {
      setError('Please provide a description and location name.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < 6 || latNum > 38 || lonNum < 68 || lonNum > 98) {
      setError('Please enter valid geographic coordinates within India (Lat: 6-38°N, Lon: 68-98°E).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitCitizenReport({
        eventType,
        description,
        locationName,
        latitude: latNum,
        longitude: lonNum,
        reporterName: reporterName.trim() || 'Citizen Observer',
        mediaType: 'none',
      });

      setResult(response);
      onSuccess(response.report);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setLocationName('');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111c30] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1728]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold font-mono tracking-wide text-white uppercase">
              Submit Citizen Weather Report
            </h3>
          </div>
          <button
            onClick={resetForm}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[85vh] overflow-y-auto font-mono text-xs">
          {result ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-lg text-emerald-200">
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>REPORT REGISTERED SUCCESSFULLY</span>
                </div>
                <p className="text-[11px] text-emerald-300">
                  Report #{result.report.id} has been recorded in the national registry and placed under active verification.
                </p>
              </div>

              {/* Ground-Truth Verification Feedback */}
              <div className="bg-[#0b1324] border border-slate-800 p-3.5 rounded-lg space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  Ground-Truth Automated Correlation
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">STATUS:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.verification.status === 'CORRELATED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {result.verification.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CORRELATION CONFIDENCE:</span>
                  <span className="font-bold text-emerald-400">
                    {Math.round(result.verification.confidence * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NEAREST STATION DISTANCE:</span>
                  <span className="text-slate-200 font-bold">
                    {result.verification.distanceKm} km (Δt = {result.verification.timeDiffMinutes} min)
                  </span>
                </div>

                <div className="text-[11px] bg-slate-900 p-2 rounded text-slate-300 leading-relaxed border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Correlation Rationale:</div>
                  {result.verification.rationale}
                </div>
              </div>

              {/* Duplicate Detection Alert if flagged */}
              {result.duplicateCheck?.isPossibleDuplicate && (
                <div className="p-3 bg-purple-950/70 border border-purple-800 rounded-lg text-purple-200">
                  <div className="flex items-center space-x-1.5 font-bold text-purple-300 mb-1">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                    <span>POSSIBLE DUPLICATE FLAGGED</span>
                  </div>
                  <p className="text-[11px] text-purple-300">
                    Matches existing Report #{result.duplicateCheck.duplicateOfId} ({Math.round(result.duplicateCheck.similarityScore * 100)}% similarity).
                  </p>
                  <ul className="list-disc pl-4 text-[10px] text-purple-300/90 mt-1 space-y-0.5">
                    {result.duplicateCheck.reasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition"
                >
                  Done & Return to Map
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Event Type */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">EVENT CATEGORY</label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="Heavy Rain">Heavy Rain (मूसलाधार बारिश)</option>
                  <option value="Thunderstorm">Thunderstorm & Lightning (आंधी-तूफान)</option>
                  <option value="Waterlogging">Urban Waterlogging / Localized Flood (जलभराव)</option>
                  <option value="Hailstorm">Hailstorm (ओलावृष्टि)</option>
                  <option value="High Wind">Gale / High Winds (तेज हवा)</option>
                  <option value="Fog">Dense Fog / Low Visibility (घना कोहरा)</option>
                  <option value="Heatwave">Severe Heatwave / Sunstroke (लू)</option>
                  <option value="Landslide">Monsoon Landslide Risk (भूस्खलन)</option>
                  <option value="Other">Other Meteorological Observation</option>
                </select>
              </div>

              {/* Location Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">LOCATION NAME / LANDMARK</label>
                <input
                  type="text"
                  placeholder="e.g. Connaught Place, New Delhi or Marine Drive, Mumbai"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">LATITUDE (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">LONGITUDE (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">OBSERVED CONDITIONS & IMPACT</label>
                <textarea
                  rows={3}
                  placeholder="Describe rainfall intensity, wind effects, water levels, visibility..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Reporter Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">REPORTER IDENTIFIER (Optional)</label>
                <input
                  type="text"
                  placeholder="Your Name / Meteorological Volunteer ID"
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  className="w-full bg-[#0a1120] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Photo Simulator */}
              <div className="p-3 bg-[#090f1d] border border-slate-800 rounded flex items-center justify-between text-slate-400">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="text-[11px]">Photo / Video Verification Evidence</span>
                </div>
                <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
                  Optional
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Verifying & Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
