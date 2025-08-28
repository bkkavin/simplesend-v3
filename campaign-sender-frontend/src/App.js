import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIG ---
const API_URL = 'http://localhost:3001'; // Your backend URL

// --- ICONS (inline SVGs) ---
const GoogleIcon = () => <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.92C34.553 6.08 29.613 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.841-5.841C34.553 6.08 29.613 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.534-11.082-8.294l-6.573 4.818C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C43.021 36.688 44 34.015 44 31c0-5.202-2.195-9.818-5.654-13.219l-5.841 5.841C39.846 24.894 42 27.461 42 31z"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const Spinner = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

// --- API HELPER ---
const api = {
    async request(endpoint, options = {}) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            credentials: 'include'
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    },
    checkAuthStatus() { return this.request('/api/auth/status'); },
    getCampaigns() { return this.request('/api/campaigns'); },
    getCampaignById(id) { return this.request(`/api/campaigns/${id}`); },
    createCampaign(data) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('campaignName', data.campaignName);
        formData.append('emailSubject', data.emailSubject);
        formData.append('emailBody', data.emailBody);
        formData.append('emailColumn', data.emailColumn);
        return this.request('/api/campaigns', { method: 'POST', body: formData });
    },
    cancelCampaign(id) { return this.request(`/api/campaigns/${id}/cancel`, { method: 'POST' }); }
};

// --- HELPER FUNCTIONS ---
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const getStatusChip = (status) => {
    const statuses = {
        'In Progress': 'text-blue-800 bg-blue-100', 'Completed': 'text-green-800 bg-green-100',
        'Cancelled': 'text-gray-800 bg-gray-100', 'Failed': 'text-red-800 bg-red-100',
        'Sent': 'text-green-800 bg-green-100', 'Queued': 'text-gray-800 bg-gray-100',
    };
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full inline-flex items-center';
    const statusClass = statuses[status] || 'text-yellow-800 bg-yellow-100';
    return <span className={`${baseClass} ${statusClass}`}>{status}</span>;
};

// --- APP COMPONENTS ---

const LoginPage = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div>
                <h1 className="text-3xl font-bold text-center text-gray-900">Campaign Sender</h1>
                <p className="mt-2 text-sm text-center text-gray-600">Minimalist, human-like email campaigns.</p>
            </div>
            <div className="pt-4">
                 <a href={`${API_URL}/auth/google`} className="flex items-center justify-center w-full px-4 py-3 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                    <GoogleIcon /> Sign in with Google
                </a>
                <p className="px-2 mt-4 text-xs text-center text-gray-500">
                    By signing in, you allow Campaign Sender to send emails on your behalf using your Google account.
                </p>
            </div>
        </div>
    </div>
);

const DashboardPage = ({ campaigns, navigate, isLoading, error }) => {
    if (isLoading) return <div className="text-center"><Spinner /> Loading campaigns...</div>;
    if (error) return <div className="text-center text-red-500">Error: {error}</div>;
    if (campaigns.length === 0) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800">No campaigns yet</h2>
                <p className="mt-1 text-gray-500">Get started by creating your first campaign.</p>
                <button onClick={() => navigate('new-campaign')} className="inline-flex items-center justify-center px-5 py-2 mt-6 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
                    <PlusIcon /> <span className="ml-2">Create Your First Campaign</span>
                </button>
            </div>
        );
    }
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                <button onClick={() => navigate('new-campaign')} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
                    <PlusIcon /> <span className="ml-2">New Campaign</span>
                </button>
            </div>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Campaign</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Progress</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Created</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {campaigns.map(campaign => (
                            <tr key={campaign.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{campaign.campaignName}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(campaign.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{campaign.progress.sent} / {campaign.progress.total}</div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(campaign.progress.sent / campaign.progress.total) * 100}%` }}></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(campaign.createdAt)}</td>
                                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                    <button onClick={() => navigate('campaign-detail', campaign.id)} className="text-indigo-600 hover:text-indigo-900">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const NewCampaignPage = ({ navigate }) => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [emailColumn, setEmailColumn] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setStep(2);
        }
    };

    const handleLaunch = async () => {
        setError('');
        if (!campaignName || !emailSubject || !emailBody || !file || !emailColumn) {
            setError("Please fill in all fields and select a file.");
            return;
        }
        setIsLaunching(true);
        try {
            await api.createCampaign({ campaignName, emailSubject, emailBody, emailColumn, file });
            navigate('dashboard');
        } catch (err) {
            setError(err.message || "Failed to launch campaign.");
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <div>
            <div className="flex items-center mb-8">
                <button onClick={() => navigate('dashboard')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Campaigns</button>
                <ChevronRightIcon />
                <span className="text-sm font-medium text-gray-900">New Campaign</span>
            </div>
            <div className="p-8 bg-white border border-gray-200 rounded-lg">
                {step === 1 && (
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Upload Recipients</h3>
                        <p className="mt-1 text-sm text-gray-500">Upload a .csv or .xlsx file.</p>
                        <div className="mt-6">
                            <label htmlFor="file-upload" className="relative flex flex-col items-center justify-center w-full h-48 p-4 text-center bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                <UploadIcon />
                                <span className="mt-2 text-sm font-medium text-indigo-600">Click to upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, .xlsx" />
                            </label>
                        </div>
                    </div>
                )}
                {step === 2 && (
                     <div>
                        <div className="pb-6 mb-6 border-b border-gray-200">
                             <h3 className="text-lg font-medium leading-6 text-gray-900">File Uploaded</h3>
                             <div className="flex items-center justify-between p-3 mt-2 text-sm bg-gray-100 border border-gray-200 rounded-md">
                                 <span>{fileName}</span>
                                 <button onClick={() => { setFile(null); setFileName(''); setStep(1); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Change file</button>
                             </div>
                             <div className="mt-4">
                                <label htmlFor="emailColumn" className="block text-sm font-medium text-gray-700">Email Column Name</label>
                                <p className="mt-1 mb-2 text-xs text-gray-500">Type the exact column header from your file that contains email addresses (e.g., `email_address` or `Email`).</p>
                                <input 
                                    type="text" 
                                    id="emailColumn" 
                                    name="emailColumn" 
                                    value={emailColumn} 
                                    onChange={(e) => setEmailColumn(e.target.value)} 
                                    className="block w-full p-2 mt-1 border-gray-300 rounded-md shadow-sm"
                                    placeholder="email_address"
                                />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Compose Email</h3>
                             <div className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">Campaign Name</label>
                                    <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700">Subject</label>
                                    <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label htmlFor="emailBody" className="block text-sm font-medium text-gray-700">Body</label>
                                    <p className="mt-1 mb-2 text-xs text-gray-500">Use `{'{{columnName}}'}` for personalization.</p>
                                    <textarea rows="10" value={emailBody} onChange={e => setEmailBody(e.target.value)} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm font-mono"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="mt-4 text-sm text-center text-red-600">{error}</p>}
            {step === 2 && (
                <div className="flex justify-end mt-6">
                    <button onClick={() => navigate('dashboard')} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleLaunch} disabled={isLaunching} type="button" className="inline-flex items-center justify-center px-6 py-2 ml-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                        {isLaunching && <Spinner />}
                        {isLaunching ? 'Launching...' : 'Launch Campaign'}
                    </button>
                </div>
            )}
        </div>
    );
};

const CampaignDetailPage = ({ campaignId, navigate }) => {
    const [campaign, setCampaign] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCampaign = useCallback(async () => {
        try {
            setError('');
            const data = await api.getCampaignById(campaignId);
            setCampaign(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch campaign details.');
        } finally {
            setIsLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        fetchCampaign();
        const interval = setInterval(() => {
            setCampaign(currentCampaign => {
                if (currentCampaign && currentCampaign.status === 'In Progress') {
                    fetchCampaign();
                }
                return currentCampaign;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchCampaign]);

    const handleCancel = async () => {
        if (window.confirm("Are you sure you want to cancel this campaign?")) {
            try {
                const updatedCampaign = await api.cancelCampaign(campaign.id);
                setCampaign(updatedCampaign);
            } catch (err) {
                alert("Error: " + err.message);
            }
        }
    };

    const handleDownload = () => {
        window.open(`${API_URL}/api/campaigns/${campaign.id}/export`, '_blank');
    };

    if (isLoading) return <div className="text-center"><Spinner /> Loading campaign...</div>;
    if (error) return <div className="text-center text-red-500">Error: {error}</div>;
    if (!campaign) return <div>Campaign not found.</div>;

    return (
        <div>
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('dashboard')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Campaigns</button>
                <ChevronRightIcon />
                <span className="text-sm font-medium text-gray-900">{campaign.campaignName}</span>
            </div>
            <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{campaign.campaignName}</h2>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <span>{getStatusChip(campaign.status)}</span>
                            <span>Created on {formatDate(campaign.createdAt)}</span>
                            <span>{campaign.progress.sent} / {campaign.progress.total} Sent</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={fetchCampaign} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"><RefreshIcon /></button>
                        {campaign.status === 'In Progress' && <button onClick={handleCancel} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"><TrashIcon /><span className="ml-2">Cancel</span></button>}
                        <button onClick={handleDownload} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"><DownloadIcon /><span className="ml-2">Download</span></button>
                    </div>
                </div>
            </div>
            <div className="mt-8">
                 <h3 className="text-xl font-semibold text-gray-900">Recipients ({campaign.recipients.length})</h3>
                 <div className="mt-4 overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Email</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {campaign.recipients.map(r => (
                                <tr key={r.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">{r.email_address}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(r.send_status)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{r.failure_reason || (r.sent_timestamp ? formatDate(r.sent_timestamp) : '—')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default function App() {
    const [page, setPage] = useState('loading');
    const [pageId, setPageId] = useState(null);
    const [auth, setAuth] = useState({ status: 'loading', user: null });
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const navigate = (newPage, id = null) => {
        setPage(newPage);
        setPageId(id);
    };

    const fetchCampaigns = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getCampaigns();
            setCampaigns(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch campaigns.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await api.checkAuthStatus();
                if (data.isAuthenticated) {
                    setAuth({ status: 'authenticated', user: data.user });
                    setPage('dashboard');
                } else {
                    setAuth({ status: 'unauthenticated', user: null });
                    setPage('login');
                }
            } catch (err) {
                setAuth({ status: 'unauthenticated', user: null });
                setPage('login');
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (page === 'dashboard' && auth.status === 'authenticated') {
            fetchCampaigns();
            const interval = setInterval(fetchCampaigns, 5000);
            return () => clearInterval(interval);
        }
    }, [page, auth.status, fetchCampaigns]);

    const renderContent = () => {
        if (auth.status === 'loading') return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
        if (page === 'login') return <LoginPage />;

        let content;
        switch (page) {
            case 'dashboard':
                content = <DashboardPage campaigns={campaigns} navigate={navigate} isLoading={isLoading} error={error} />;
                break;
            case 'new-campaign':
                content = <NewCampaignPage navigate={navigate} />;
                break;
            case 'campaign-detail':
                content = <CampaignDetailPage campaignId={pageId} navigate={navigate} />;
                break;
            default:
                content = <DashboardPage campaigns={campaigns} navigate={navigate} isLoading={isLoading} error={error} />;
        }

        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm">
                    <nav className="container max-w-5xl px-4 py-3 mx-auto">
                        <div className="flex items-center justify-between">
                            <div className="text-xl font-bold text-gray-800">Campaign Sender</div>
                            <div className="flex items-center space-x-4">
                               <span className="text-sm text-gray-600">{auth.user?.email}</span>
                               <a href={`${API_URL}/auth/logout`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Log out</a>
                            </div>
                        </div>
                    </nav>
                </header>
                <main className="container max-w-5xl px-4 py-10 mx-auto">
                    {content}
                </main>
            </div>
        );
    };

    return renderContent();
}
