import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Tasks from "./Tasks";

import Focus from "./Focus";

import Analytics from "./Analytics";

import Settings from "./Settings";

import Calendar from "./Calendar";

import Insights from "./Insights";

import Teams from "./Teams";

import TeamDashboard from "./TeamDashboard";

import Meetings from "./Meetings";

import TimeTracking from "./TimeTracking";

import Reminders from "./Reminders";

import Contacts from "./Contacts";

import Login from "./Login";

import Signup from "./Signup";

import ResetPassword from "./ResetPassword";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Tasks: Tasks,
    
    Focus: Focus,
    
    Analytics: Analytics,
    
    Settings: Settings,
    
    Calendar: Calendar,
    
    Insights: Insights,
    
    Teams: Teams,
    
    TeamDashboard: TeamDashboard,
    
    Meetings: Meetings,
    
    TimeTracking: TimeTracking,
    
    Reminders: Reminders,
    
    Contacts: Contacts,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Layout currentPageName={currentPage}><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/Dashboard" element={<ProtectedRoute><Layout currentPageName={currentPage}><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/Tasks" element={<ProtectedRoute><Layout currentPageName={currentPage}><Tasks /></Layout></ProtectedRoute>} />
            <Route path="/Focus" element={<ProtectedRoute><Layout currentPageName={currentPage}><Focus /></Layout></ProtectedRoute>} />
            <Route path="/Analytics" element={<ProtectedRoute><Layout currentPageName={currentPage}><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/Settings" element={<ProtectedRoute><Layout currentPageName={currentPage}><Settings /></Layout></ProtectedRoute>} />
            <Route path="/Calendar" element={<ProtectedRoute><Layout currentPageName={currentPage}><Calendar /></Layout></ProtectedRoute>} />
            <Route path="/Insights" element={<ProtectedRoute><Layout currentPageName={currentPage}><Insights /></Layout></ProtectedRoute>} />
            <Route path="/Teams" element={<ProtectedRoute><Layout currentPageName={currentPage}><Teams /></Layout></ProtectedRoute>} />
            <Route path="/TeamDashboard" element={<ProtectedRoute><Layout currentPageName={currentPage}><TeamDashboard /></Layout></ProtectedRoute>} />
            <Route path="/Meetings" element={<ProtectedRoute><Layout currentPageName={currentPage}><Meetings /></Layout></ProtectedRoute>} />
            <Route path="/TimeTracking" element={<ProtectedRoute><Layout currentPageName={currentPage}><TimeTracking /></Layout></ProtectedRoute>} />
            <Route path="/Reminders" element={<ProtectedRoute><Layout currentPageName={currentPage}><Reminders /></Layout></ProtectedRoute>} />
            <Route path="/Contacts" element={<ProtectedRoute><Layout currentPageName={currentPage}><Contacts /></Layout></ProtectedRoute>} />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}