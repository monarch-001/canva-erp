import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderCreate from './pages/WorkOrderCreate';
import WorkOrderDetail from './pages/WorkOrderDetail';
import AttendanceMarking from './pages/AttendanceMarking';
import ProductionFloor from './pages/ProductionFloor';
import JobCardCreate from './pages/JobCardCreate';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Default redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard Route */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Work Order Routes */}
        <Route path="/work-orders" element={<WorkOrderList />} />
        <Route path="/work-orders/new" element={<WorkOrderCreate />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        
        {/* Production/Manpower Routes */}
        <Route path="/production" element={<ProductionFloor />} />
        <Route path="/production/attendance" element={<AttendanceMarking />} />
        <Route path="/production/job-cards/new" element={<JobCardCreate />} />
        
        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
