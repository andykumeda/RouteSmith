import { useState, useEffect } from 'react';
import { X, User, MapPin, Ruler, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { user, updateProfile, isLoading } = useAuthStore();
    const { units, toggleUnits } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');
    const [username, setUsername] = useState('');
    const [hometown, setHometown] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setUsername(user.username);
            setHometown(user.hometown || '');
            setAvatarUrl(user.avatar || '');
            setSuccessMsg('');
        }
    }, [isOpen, user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        await updateProfile({
            username,
            hometown,
            avatar: avatarUrl
        });
        setSuccessMsg('Profile updated!');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Settings</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('preferences')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'preferences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Preferences
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {activeTab === 'profile' ? (
                        user ? (
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="flex justify-center mb-4">
                                    <img src={avatarUrl || user.avatar} alt="Preview" className="w-20 h-20 rounded-full border-4 border-gray-100 shadow-sm" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Hometown</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={hometown}
                                            onChange={(e) => setHometown(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Avatar URL</label>
                                    <input
                                        type="url"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400">Enter an image URL to change your avatar.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                                </button>

                                {successMsg && (
                                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium bg-green-50 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                        <Check size={16} /> {successMsg}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div className="text-center text-gray-400 py-8">
                                Please log in to edit your profile.
                            </div>
                        )
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-gray-600">
                                        <Ruler size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Units</h3>
                                        <p className="text-xs text-gray-500">Display distances in:</p>
                                    </div>
                                </div>
                                <div className="flex items-center bg-gray-200 rounded-lg p-1">
                                    <button
                                        onClick={() => units !== 'imperial' && toggleUnits()}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${units === 'imperial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Imperial
                                    </button>
                                    <button
                                        onClick={() => units !== 'metric' && toggleUnits()}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${units === 'metric' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Metric
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
