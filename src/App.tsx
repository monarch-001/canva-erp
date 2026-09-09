import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderCreate from './pages/WorkOrderCreate';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderPrint from './pages/WorkOrderPrint';
import AttendanceMarking from './pages/AttendanceMarking';
import ProductionFloor from './pages/ProductionFloor';
import JobCardCreate from './pages/JobCardCreate';
import JobCardDetail from './pages/JobCardDetail';
import Dashboard from './pages/Dashboard';
import SiteManagerDashboard from './pages/SiteManagerDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import FMAlertsDashboard from './pages/FMAlertsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import OvertimeManagement from './pages/OvertimeManagement';
import SubmitOTRequest from './pages/SubmitOTRequest';
import HolidayWeekendFlow from './pages/HolidayWeekendFlow';
import CRDetail from './pages/CRDetail';
import QualityControl from './pages/QualityControl';
import QCEntry from './pages/QCEntry';
import Dispatch from './pages/Dispatch';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import StockCheckResult from './pages/StockCheckResult';
import ChangeRequestsList from './pages/ChangeRequestsList';
import QuotationList from './pages/QuotationList';
import QuotationCreate from './pages/QuotationCreate';
import QuotationDetail from './pages/QuotationDetail';
import BOMCreate from './pages/BOMCreate';
import BOMApproval from './pages/BOMApproval';
import BOMTemplates from './pages/BOMTemplates';
import PurchaseRequisitionList from './pages/PurchaseRequisitionList';
import PRCreate from './pages/PRCreate';
import PRApproval from './pages/PRApproval';
import PurchaseOrderList from './pages/PurchaseOrderList';
import POCreate from './pages/POCreate';
import POApproval from './pages/POApproval';
import UserDirectory from './pages/UserDirectory';
import DatabaseExplorer from './pages/DatabaseExplorer';

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
        <Route path="/work-orders/:id/print" element={<WorkOrderPrint />} />
        <Route path="/work-orders/:id/stock-check" element={<StockCheckResult />} />
        
        {/* Production/Manpower Routes */}
        <Route path="/production" element={<ProductionFloor />} />
        <Route path="/production/attendance" element={<AttendanceMarking />} />
        <Route path="/production/job-cards/new" element={<JobCardCreate />} />
        <Route path="/production/job-cards/:id" element={<JobCardDetail />} />
        
        {/* Quality Control, Dispatch, Invoicing & Reports Routes */}
        <Route path="/quality-control" element={<QualityControl />} />
        <Route path="/quality-control/new" element={<QCEntry />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/reports" element={<Reports />} />
        
        {/* Site Manager Routes */}
        <Route path="/site-manager" element={<SiteManagerDashboard />} />
        <Route path="/site-manager/work-orders" element={<SiteManagerDashboard />} />

        {/* Super Admin (Chhabee) Routes */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/work-orders" element={<SuperAdminDashboard />} />

        {/* FM Alerts Dashboard */}
        <Route path="/fm-alerts" element={<FMAlertsDashboard />} />

        {/* Overtime Management */}
        <Route path="/production/overtime" element={<OvertimeManagement />} />
        <Route path="/production/overtime/new" element={<SubmitOTRequest />} />
        <Route path="/production/overtime/holiday-flow" element={<HolidayWeekendFlow />} />

        {/* Quotation Routes */}
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationCreate />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/quotations/:id/revision" element={<QuotationCreate />} />
        <Route path="/quotations/:id/edit" element={<QuotationCreate />} />
        <Route path="/quotations/:id/convert" element={<QuotationDetail />} />

        {/* BOM Routes */}
        <Route path="/bom/new" element={<BOMCreate />} />
        <Route path="/bom/:id/edit" element={<BOMCreate />} />
        <Route path="/bom/:id/approve" element={<BOMApproval />} />
        <Route path="/bom/:id/stock-check" element={<StockCheckResult />} />
        <Route path="/bom/templates" element={<BOMTemplates />} />

        {/* Purchase Requisition Routes */}
        <Route path="/purchase-requisitions" element={<PurchaseRequisitionList />} />
        <Route path="/purchase-requisitions/new" element={<PRCreate />} />
        <Route path="/purchase-requisitions/:id" element={<PRApproval />} />

        {/* Purchase Order Routes */}
        <Route path="/purchase-orders" element={<PurchaseOrderList />} />
        <Route path="/purchase-orders/new" element={<POCreate />} />
        <Route path="/purchase-orders/:id" element={<POApproval />} />

        {/* Change Request Routes */}
        <Route path="/change-requests" element={<ChangeRequestsList />} />
        <Route path="/change-requests/:id" element={<CRDetail />} />

        {/* Notification Settings & User Directory */}
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/settings/users" element={<UserDirectory />} />
        <Route path="/settings/db" element={<DatabaseExplorer />} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
