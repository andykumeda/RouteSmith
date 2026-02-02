import { useState, useEffect } from 'react';
import { Map, Save, Trash2 } from 'lucide-react';
import { useRouteStore } from '../../store/useRouteStore';

interface RouteImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => Promise<void>; // Callback to save the route to backend
}

export default function RouteImportModal({ isOpen, onClose, onSave }: RouteImportModalProps) {
    const { routeName, setRouteName, setReadOnly, setRouteId, clearRoute } = useRouteStore();
    const [localName, setLocalName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalName(routeName);
        }
    }, [isOpen, routeName]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setRouteName(localName);
        setReadOnly(false); // Make it editable
        setRouteId(null); // Clear route ID so a new route is created instead of updating existing

        // If onSave callback provided, save to backend
        if (onSave) {
            setIsSaving(true);
            try {
                await onSave();
                onClose();
            } catch (err) {
                console.error('[RouteImportModal] Save failed:', err);
                // Don't close modal if save fails
            } finally {
                setIsSaving(false);
            }
        } else {
            onClose();
        }
    };

    const handleCancel = () => {
        clearRoute(); // Don't keep the imported route if cancelled
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                            <Map size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Import Route</h2>
                            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Review Details</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Route Name</label>
                        <input
                            type="text"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-800 font-medium"
                            placeholder="Give your route a name..."
                        />
                        <p className="text-[11px] text-gray-400 ml-1">This name will be used to identify your route later.</p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <Trash2 size={18} className="group-hover:text-red-500 transition-colors" />
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-[2] px-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="group-hover:translate-y-[-1px] transition-transform" />
                                    Save Route
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
