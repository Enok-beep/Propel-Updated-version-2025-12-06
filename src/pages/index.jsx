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
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Tasks" element={<Tasks />} />
                
                <Route path="/Focus" element={<Focus />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/Insights" element={<Insights />} />
                
                <Route path="/Teams" element={<Teams />} />
                
                <Route path="/TeamDashboard" element={<TeamDashboard />} />
                
                <Route path="/Meetings" element={<Meetings />} />
                
                <Route path="/TimeTracking" element={<TimeTracking />} />
                
                <Route path="/Reminders" element={<Reminders />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}