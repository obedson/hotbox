import { LifeBuoy, Wallet, X } from 'lucide-react';

export default function TicketModal({
  isOpen, newTicket, setNewTicket, shipments, setIsTicketModalOpen, handleSubmitTicket
}) {
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">New Support Ticket</h3>
                  <p className="text-[11px] text-slate-500">Customer care team typically responds within 2-4 hours</p>
                </div>
              </div>
              <button onClick={() => setIsTicketModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Issue Category</label>
                  <select
                    value={newTicket.category}
                    onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="GENERAL_ENQUIRY">General Enquiry</option>
                    <option value="DELIVERY_DELAY">Delivery Delay</option>
                    <option value="BILLING_ISSUE">Billing & Wallet</option>
                    <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                    <option value="HUB_PICKUP_ISSUE">Hub Pickup Issue</option>
                    <option value="TECHNICAL_SUPPORT">Technical Support</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {shipments && shipments.length > 0 && (
                <div>
                  <label className="font-bold block mb-1">Related Shipment (Optional)</label>
                  <select
                    value={newTicket.shipmentId || ''}
                    onChange={e => setNewTicket({ ...newTicket, shipmentId: e.target.value || null })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="">None / General Inquiry</option>
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tracking_code} ({s.recipient_name} • {s.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="e.g. Enquiry regarding parcel dispatch delay"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Detailed Message</label>
                <textarea
                  required
                  rows="4"
                  value={newTicket.message}
                  onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-xs shadow-xs"
                >
                  Submit Support Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
