import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getCurrentUser } from '../utils/auth';

export default function WorkOrderCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [clientType, setClientType] = useState('b2b');
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [poRef, setPoRef] = useState('');
  const [poValue, setPoValue] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [furnitureType, setFurnitureType] = useState('Table');
  const [quantity, setQuantity] = useState(1);
  const [dimL, setDimL] = useState('');
  const [dimH, setDimH] = useState('');
  const [dimD, setDimD] = useState('');
  const [finishType, setFinishType] = useState('Natural Veneer');
  const [finishDetail, setFinishDetail] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('included');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [requestedDate, setRequestedDate] = useState('');

  useEffect(() => {
    if (location.state && location.state.cloneFrom) {
      const c = location.state.cloneFrom;
      setClientType(c.client_type || 'b2b');
      setClientName(c.client_name || '');
      setProjectName(c.project_name || '');
      setPoRef(c.client_po_reference || '');
      setPoValue(c.client_po_value ? c.client_po_value.toString() : '');
      // Enforce supervisor/site manager priority restrictions when cloning
      if (user.role === 'site_manager') {
        setPriority('normal');
      } else if (user.role === 'supervisor' && c.priority === 'critical') {
        setPriority('high');
      } else {
        setPriority(c.priority || 'normal');
      }
      setTitle((c.title || '') + ' (Copy)');
      setFurnitureType(c.furniture_type || 'Table');
      setQuantity(c.production_quantity || 1);
      setDimL(c.dimensions_l ? c.dimensions_l.toString() : '');
      setDimH(c.dimensions_h ? c.dimensions_h.toString() : '');
      setDimD(c.dimensions_d ? c.dimensions_d.toString() : '');
      setFinishType(c.finish_type || 'Natural Veneer');
      setFinishDetail(c.finish_detail || '');
      setDeliveryTerms(c.delivery_terms || 'included');
      setDeliveryAddress(c.delivery_address || '');
    }
  }, [location.state, user.role]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName) {
      setError('Item Title and Client Name are required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const body = {
      title,
      client_type: clientType,
      client_name: clientName,
      project_name: projectName,
      stream: clientType === 'chhabee' ? 'chhabee' : clientType === 'b2b' ? 'external_b2b' : 'd2c',
      furniture_type: furnitureType,
      dimensions_l: dimL ? parseFloat(dimL) : null,
      dimensions_h: dimH ? parseFloat(dimH) : null,
      dimensions_d: dimD ? parseFloat(dimD) : null,
      finish_type: finishType,
      finish_detail: finishDetail,
      delivery_terms: deliveryTerms,
      delivery_address: deliveryAddress,
      requested_delivery_date: requestedDate || null,
      priority,
      production_quantity: quantity,
      client_po_reference: poRef || null,
      client_po_value: poValue ? parseFloat(poValue) : null
    };

    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/work-orders/${data.id}`);
      } else {
        const resErr = await response.json();
        setError(resErr.error || 'Failed to create work order.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <main className="ml-sidebar-width flex-1 min-h-screen">
        <Header title="New Work Order" />

        <div className="max-w-container-max mx-auto p-lg">
          <form onSubmit={handleSubmit} className="space-y-lg">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary">Work Order Initialization</h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                  Complete the manufacturing specification form below. Ensure all technical dimensions and finish details are validated before submission.
                </p>
              </div>
              <div className="flex items-center gap-sm">
                <button
                  onClick={() => navigate('/work-orders')}
                  className="px-lg py-2 border border-primary text-primary font-label-md text-label-md rounded-lg hover:bg-surface-container-highest transition-all"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  className="px-lg py-2 bg-secondary text-on-primary font-label-md text-label-md rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  type="submit"
                >
                  {loading ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-status-error/10 border-l-4 border-status-error text-status-error p-md rounded-r-lg font-body-md">
                {error}
              </div>
            )}

            {/* Bento Grid Layout for Sections */}
            <div className="grid grid-cols-12 gap-lg">
              
              {/* Section 1: Client Details */}
              <section className="col-span-12 lg:col-span-7 form-section-card p-xl rounded-xl">
                <div className="flex items-center mb-lg">
                  <span className="material-symbols-outlined text-secondary mr-sm">person</span>
                  <h3 className="font-title-md text-title-md text-primary">Client Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                  <div className="md:col-span-2">
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-base">Client Type</label>
                    <div className="flex items-center space-x-lg mt-sm">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          checked={clientType === 'chhabee'}
                          onChange={() => setClientType('chhabee')}
                          className="w-4 h-4 text-secondary border-outline focus:ring-secondary"
                          name="client_type"
                          type="radio"
                        />
                        <span className="ml-sm font-body-md text-body-md group-hover:text-secondary transition-colors">Chhabee</span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          checked={clientType === 'b2b'}
                          onChange={() => setClientType('b2b')}
                          className="w-4 h-4 text-secondary border-outline focus:ring-secondary"
                          name="client_type"
                          type="radio"
                        />
                        <span className="ml-sm font-body-md text-body-md group-hover:text-secondary transition-colors">Commercial B2B</span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          checked={clientType === 'd2c'}
                          onChange={() => setClientType('d2c')}
                          className="w-4 h-4 text-secondary border-outline focus:ring-secondary"
                          name="client_type"
                          type="radio"
                        />
                        <span className="ml-sm font-body-md text-body-md group-hover:text-secondary transition-colors">D2C</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">Client Name *</label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md"
                      placeholder="e.g. Acme Corp"
                      type="text"
                      required
                    />
                  </div>
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">Project Name</label>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md"
                      placeholder="e.g. Warehouse Renovation"
                      type="text"
                    />
                  </div>
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">
                      PO Reference / Chhabee Ref {clientType === 'b2b' && <span className="text-status-error">*</span>}
                    </label>
                    <input
                      value={poRef}
                      onChange={(e) => setPoRef(e.target.value)}
                      required={clientType === 'b2b'}
                      className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md"
                      placeholder="PO-XXXXX"
                      type="text"
                    />
                  </div>
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">
                      PO Value (INR) {clientType === 'b2b' && <span className="text-status-error">*</span>}
                    </label>
                    <input
                      value={poValue}
                      onChange={(e) => setPoValue(e.target.value)}
                      required={clientType === 'b2b'}
                      className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md"
                      placeholder="e.g. 150000"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </section>

              {/* Section 6: Priority & Notes */}
              <section className="col-span-12 lg:col-span-5 form-section-card p-xl rounded-xl bg-surface-container-low border-secondary/20">
                <div className="flex items-center mb-lg">
                  <span className="material-symbols-outlined text-secondary mr-sm">priority_high</span>
                  <h3 className="font-title-md text-title-md text-primary">Manufacturing Priority</h3>
                </div>
                <div className="grid grid-cols-3 gap-sm mb-lg">
                  <label className="cursor-pointer">
                    <input
                      checked={priority === 'normal'}
                      onChange={() => setPriority('normal')}
                      className="peer hidden"
                      name="priority"
                      type="radio"
                      value="normal"
                    />
                    <div className="flex flex-col items-center justify-center p-md border border-border-subtle rounded-lg bg-white peer-checked:border-secondary peer-checked:bg-secondary-fixed/30 transition-all hover:bg-surface text-center">
                      <span className="font-label-md text-label-md">Normal</span>
                    </div>
                  </label>
                  <label className={`cursor-pointer ${user.role === 'site_manager' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <input
                      checked={priority === 'high'}
                      onChange={() => setPriority('high')}
                      disabled={user.role === 'site_manager'}
                      className="peer hidden"
                      name="priority"
                      type="radio"
                      value="high"
                    />
                    <div className="flex flex-col items-center justify-center p-md border border-border-subtle rounded-lg bg-white peer-checked:border-status-pending peer-checked:bg-status-pending/10 transition-all hover:bg-surface text-center">
                      <span className="font-label-md text-label-md text-status-pending">High</span>
                    </div>
                  </label>
                  <label className={`cursor-pointer ${user.role === 'site_manager' || user.role === 'supervisor' ? 'opacity-40 pointer-events-none' : ''}`}>
                    <input
                      checked={priority === 'critical'}
                      onChange={() => setPriority('critical')}
                      disabled={user.role === 'site_manager' || user.role === 'supervisor'}
                      className="peer hidden"
                      name="priority"
                      type="radio"
                      value="critical"
                    />
                    <div className="flex flex-col items-center justify-center p-md border border-border-subtle rounded-lg bg-white peer-checked:border-status-error peer-checked:bg-status-error/10 transition-all hover:bg-surface text-center">
                      <span className="font-label-md text-label-md text-status-error">Critical</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-base">
                  <label className="block font-label-md text-label-md text-on-surface-variant">Special Manufacturing Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-border-subtle rounded-lg p-md font-body-md resize-none focus:ring-0"
                    placeholder="Mention any specific engineering constraints or handling requirements..."
                    rows={4}
                  />
                </div>
              </section>

              {/* Section 2 & 3: Furniture & Dimensions */}
              <section className="col-span-12 lg:col-span-8 form-section-card p-xl rounded-xl">
                <div className="flex items-center justify-between mb-lg">
                  <div className="flex items-center">
                    <span className="material-symbols-outlined text-secondary mr-sm">chair</span>
                    <h3 className="font-title-md text-title-md text-primary">Product Specifications</h3>
                  </div>
                  <div className="text-xs font-label-md text-on-surface-variant bg-surface-container px-sm py-0.5 rounded">ITEM #01</div>
                </div>
                <div className="grid grid-cols-12 gap-xl">
                  {/* Furniture Details */}
                  <div className="col-span-12 md:col-span-6 space-y-xl">
                    <div className="space-y-base">
                      <label className="block font-label-md text-label-md text-on-surface-variant">Item Title *</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md"
                        placeholder="Executive Oak Workstation"
                        type="text"
                        required
                      />
                    </div>
                    <div className="space-y-base">
                      <label className="block font-label-md text-label-md text-on-surface-variant">Type</label>
                      <div className="flex flex-wrap gap-xs mt-xs">
                        {['Table', 'Cabinet', 'Shelf', 'Partition'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFurnitureType(type)}
                            className={`px-sm py-1 border rounded-full text-xs font-body-md transition-all ${
                              furnitureType === type
                                ? 'bg-secondary text-on-primary border-secondary font-bold'
                                : 'border-border-subtle hover:bg-surface-container-high'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-base">
                      <label className="block font-label-md text-label-md text-on-surface-variant">Quantity</label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 border border-border-subtle rounded-l-lg bg-surface flex items-center justify-center hover:bg-surface-container-high"
                        >
                          -
                        </button>
                        <input
                          readOnly
                          className="w-16 h-10 border-y border-x-0 border-border-subtle text-center font-title-md"
                          type="number"
                          value={quantity}
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 border border-border-subtle rounded-r-lg bg-surface flex items-center justify-center hover:bg-surface-container-high"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Dimensions (Section 3) */}
                  <div className="col-span-12 md:col-span-6">
                    <div className="bg-surface-container-lowest p-lg rounded-lg border border-dashed border-border-subtle">
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-lg">Dimensions (in mm)</label>
                      <div className="space-y-md">
                        <div className="flex items-center justify-between">
                          <span className="font-body-md text-on-surface-variant">Length (L)</span>
                          <div className="flex items-center">
                            <input
                              value={dimL}
                              onChange={(e) => setDimL(e.target.value)}
                              className="w-24 h-10 border border-border-subtle rounded-lg px-md font-body-md text-right focus:ring-0"
                              placeholder="0000"
                              type="number"
                            />
                            <span className="ml-sm text-xs opacity-50">mm</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-body-md text-on-surface-variant">Height (H)</span>
                          <div className="flex items-center">
                            <input
                              value={dimH}
                              onChange={(e) => setDimH(e.target.value)}
                              className="w-24 h-10 border border-border-subtle rounded-lg px-md font-body-md text-right focus:ring-0"
                              placeholder="0000"
                              type="number"
                            />
                            <span className="ml-sm text-xs opacity-50">mm</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-body-md text-on-surface-variant">Depth (D)</span>
                          <div className="flex items-center">
                            <input
                              value={dimD}
                              onChange={(e) => setDimD(e.target.value)}
                              className="w-24 h-10 border border-border-subtle rounded-lg px-md font-body-md text-right focus:ring-0"
                              placeholder="0000"
                              type="number"
                            />
                            <span className="ml-sm text-xs opacity-50">mm</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Finish */}
              <section className="col-span-12 lg:col-span-4 form-section-card p-xl rounded-xl">
                <div className="flex items-center mb-lg">
                  <span className="material-symbols-outlined text-secondary mr-sm">palette</span>
                  <h3 className="font-title-md text-title-md text-primary">Surface Finish</h3>
                </div>
                <div className="space-y-xl">
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">Finish Type</label>
                    <select
                      value={finishType}
                      onChange={(e) => setFinishType(e.target.value)}
                      className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md bg-surface focus:ring-0"
                    >
                      <option value="Natural Veneer">Natural Veneer</option>
                      <option value="Matte Laminate">Matte Laminate</option>
                      <option value="Glossy PU">Glossy PU</option>
                      <option value="Powder Coated Metal">Powder Coated Metal</option>
                      <option value="Industrial Raw">Industrial Raw</option>
                    </select>
                  </div>
                  <div className="space-y-base">
                    <label className="block font-label-md text-label-md text-on-surface-variant">Finish Details & Codes</label>
                    <textarea
                      value={finishDetail}
                      onChange={(e) => setFinishDetail(e.target.value)}
                      className="w-full border border-border-subtle rounded-lg p-md font-body-md resize-none focus:ring-0"
                      placeholder="Specify RAL codes, texture grain direction, or specific laminate brands..."
                      rows={6}
                    />
                  </div>
                </div>
              </section>

              {/* Section 5: Delivery */}
              <section className="col-span-12 form-section-card p-xl rounded-xl">
                <div className="flex items-center mb-lg">
                  <span className="material-symbols-outlined text-secondary mr-sm">local_shipping</span>
                  <h3 className="font-title-md text-title-md text-primary">Logistics & Delivery</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                  <div className="space-y-md">
                    <label className="block font-label-md text-label-md text-on-surface-variant">Terms of Delivery</label>
                    <div className="space-y-sm">
                      <label className="flex items-center cursor-pointer p-md border border-border-subtle rounded-lg hover:bg-surface transition-colors">
                        <input
                          checked={deliveryTerms === 'included'}
                          onChange={() => setDeliveryTerms('included')}
                          className="text-secondary focus:ring-secondary"
                          name="delivery_terms"
                          type="radio"
                        />
                        <div className="ml-md">
                          <span className="block font-label-md text-label-md">Included in Price</span>
                          <span className="block text-xs text-on-surface-variant">Delivery cost absorbed in WO price</span>
                        </div>
                      </label>
                      <label className="flex items-center cursor-pointer p-md border border-border-subtle rounded-lg hover:bg-surface transition-colors">
                        <input
                          checked={deliveryTerms === 'actuals'}
                          onChange={() => setDeliveryTerms('actuals')}
                          className="text-secondary focus:ring-secondary"
                          name="delivery_terms"
                          type="radio"
                        />
                        <div className="ml-md">
                          <span className="block font-label-md text-label-md">Billed at Actuals</span>
                          <span className="block text-xs text-on-surface-variant">We arrange, client pays actual cost</span>
                        </div>
                      </label>
                      <label className="flex items-center cursor-pointer p-md border border-border-subtle rounded-lg hover:bg-surface transition-colors">
                        <input
                          checked={deliveryTerms === 'client_arranges'}
                          onChange={() => setDeliveryTerms('client_arranges')}
                          className="text-secondary focus:ring-secondary"
                          name="delivery_terms"
                          type="radio"
                        />
                        <div className="ml-md">
                          <span className="block font-label-md text-label-md">Client Arranges</span>
                          <span className="block text-xs text-on-surface-variant">Client pays transporter directly</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-xl">
                    <div className="space-y-base md:col-span-2">
                      <label className="block font-label-md text-label-md text-on-surface-variant">Delivery Address</label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full border border-border-subtle rounded-lg p-md font-body-md resize-none focus:ring-0"
                        placeholder="Full street address, loading dock details, and site contact..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-base">
                      <label className="block font-label-md text-label-md text-on-surface-variant">Requested Delivery Date</label>
                      <div className="relative">
                        <input
                          value={requestedDate}
                          onChange={(e) => setRequestedDate(e.target.value)}
                          className="w-full h-10 border border-border-subtle rounded-lg px-md font-body-md focus:ring-0"
                          type="date"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sticky Footer Action Bar */}
            <div className="sticky bottom-xl left-0 right-0 z-30 mt-xl">
              <div className="max-w-container-max mx-auto px-lg">
                <div className="bg-surface border border-border-subtle rounded-xl p-md shadow-lg flex items-center justify-between backdrop-blur-md bg-opacity-90">
                  <div className="flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined mr-sm text-status-success">check_circle</span>
                    <span className="font-body-md">
                      {title && clientName 
                        ? 'All mandatory fields are complete.' 
                        : 'Please fill in Item Title and Client Name.'
                      }
                    </span>
                  </div>
                  <div className="flex gap-md">
                    <button
                      onClick={() => navigate('/work-orders')}
                      className="px-xl py-3 border border-primary text-primary font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-all"
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={loading}
                      className="px-xl py-3 bg-secondary text-on-primary font-label-md text-label-md rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center disabled:opacity-50"
                      type="submit"
                    >
                      <span className="material-symbols-outlined mr-sm">assignment_turned_in</span>
                      {loading ? 'Creating...' : 'Create Work Order'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
