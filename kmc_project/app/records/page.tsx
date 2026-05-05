"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ActivityRecord {
  id: string;
  type: string;
  title: string;
  date: string;
  faculty: string;
  category: string;
  created_at: string;
}

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: organized } = await supabase.from('activities_organized').select('*');
        const { data: attended } = await supabase.from('activities_attended').select('*');
        const { data: support } = await supabase.from('student_support_activities').select('*');

        const orgList = organized || [];
        const attList = attended || [];
        const supList = support || [];

        const allRecords = [
          ...orgList.map(item => ({
            id: item.id,
            type: 'ORGANIZED',
            title: item.program_title,
            date: item.start_date || item.created_at,
            faculty: item.convener_name,
            category: 'SEMINAR',
            created_at: item.created_at
          })),
          ...attList.map(item => ({
            id: item.id,
            type: 'ATTENDED',
            title: item.program_title,
            date: item.start_date || item.created_at,
            faculty: item.teacher_name,
            category: 'CONFERENCE',
            created_at: item.created_at
          })),
          ...supList.map(item => ({
            id: item.id,
            type: 'SUPPORT',
            title: item.activity_name,
            date: item.created_at,
            faculty: item.coordinator_name,
            category: 'SUPPORT',
            created_at: item.created_at
          }))
        ];

        allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecords(allRecords);
      } catch (error) {
        console.error("Error fetching records:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-lg max-w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-end gap-4 sm:gap-0 mb-lg">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">All Records</h2>
          <p className="font-body-md text-gray-600 max-w-[600px] mt-2">
            Comprehensive master list of all academic activities, seminars, and research support documented for the current audit cycle.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 font-label-caps hover:bg-gray-50 transition-colors duration-300 shadow-sm rounded-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            EXPORT PDF
          </button>
          <a href="/activities" className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-label-caps hover:bg-red-950 transition-colors duration-300 shadow-sm rounded-sm">
            <span className="material-symbols-outlined text-sm">add</span>
            NEW ENTRY
          </a>
        </div>
      </div>

      {/* Metric Summary Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-lg">
        <div className="bg-white border border-gray-200 p-md border-t-2 border-t-secondary-container shadow-sm">
          <p className="font-label-caps text-gray-500 mb-1">TOTAL RECORDS</p>
          <h3 className="font-headline-md text-headline-md text-primary">{loading ? "-" : records.length}</h3>
        </div>
        <div className="bg-white border border-gray-200 p-md border-t-2 border-t-secondary shadow-sm">
          <p className="font-label-caps text-gray-500 mb-1">ORGANIZED</p>
          <h3 className="font-headline-md text-headline-md text-primary">{loading ? "-" : records.filter(r => r.type === "ORGANIZED").length}</h3>
        </div>
        <div className="bg-white border border-gray-200 p-md border-t-2 border-t-secondary-container shadow-sm">
          <p className="font-label-caps text-gray-500 mb-1">ATTENDED</p>
          <h3 className="font-headline-md text-headline-md text-primary">{loading ? "-" : records.filter(r => r.type === "ATTENDED").length}</h3>
        </div>
        <div className="bg-white border border-gray-200 p-md border-t-2 border-t-secondary shadow-sm">
          <p className="font-label-caps text-gray-500 mb-1">STUDENT SUPPORT</p>
          <h3 className="font-headline-md text-headline-md text-primary">{loading ? "-" : records.filter(r => r.type === "SUPPORT").length}</h3>
        </div>
      </div>

      {/* Table Controls */}
      <div className="bg-white border border-gray-200 p-md mb-xs flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[300px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input 
            className="w-full pl-10 pr-4 py-2 bg-background border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-body-md text-sm rounded-sm" 
            placeholder="Search by title, faculty, or code..." 
            type="text"
          />
        </div>
        <div className="flex gap-2">
          <select className="bg-background border border-gray-200 px-3 py-2 text-xs font-label-caps focus:border-primary outline-none rounded-sm">
            <option>ALL TYPES</option>
            <option>SEMINAR</option>
            <option>CONFERENCE</option>
            <option>RESEARCH SUPPORT</option>
          </select>
          <button className="px-3 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-sm">
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </button>
        </div>
      </div>

      {/* Master Table */}
      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-gray-100">
            {records.map((record, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    record.type === 'ORGANIZED' ? 'bg-secondary-container/20 text-secondary border-secondary/30' :
                    record.type === 'ATTENDED' ? 'bg-primary-fixed/20 text-primary border-primary/30' :
                    'bg-tertiary-container/20 text-tertiary border-tertiary/30'
                  }`}>
                    {record.category}
                  </span>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === record.id ? null : record.id)}
                      className="text-gray-400 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">more_vert</span>
                    </button>
                    {activeDropdown === record.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 shadow-xl z-50 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        <a 
                          href={`/activities?tab=${record.type === 'ORGANIZED' ? 'organized' : record.type === 'ATTENDED' ? 'attended' : 'support'}&editId=${record.id}`}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm text-blue-600">edit</span>
                          Edit Record
                        </a>
                        {(record as any).evidence_url && (
                          <a 
                            href={(record as any).evidence_url} 
                            target="_blank"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm text-green-600">link</span>
                            View Related Files
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <h4 className="font-semibold text-primary mb-1">{record.title || "Untitled"}</h4>
                <div className="flex flex-col gap-1 text-xs text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    {record.date ? new Date(record.date).toLocaleDateString() : "N/A"}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {record.faculty || "Unknown Faculty"}
                  </div>
                </div>
              </div>
            ))}
            {!loading && records.length === 0 && (
              <div className="p-8 text-center text-gray-500">No records found.</div>
            )}
          </div>

          {/* Desktop Table View */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-surface-container-low border-b border-gray-200">
                <th className="px-md py-sm font-label-caps text-gray-500">TYPE</th>
                <th className="px-md py-sm font-label-caps text-gray-500">TITLE</th>
                <th className="px-md py-sm font-label-caps text-gray-500">DATE</th>
                <th className="px-md py-sm font-label-caps text-gray-500">FACULTY</th>
                <th className="px-md py-sm font-label-caps text-gray-500 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-table-data text-table-data">
              {records.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-md py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      record.type === 'ORGANIZED' ? 'bg-secondary-container/20 text-secondary border-secondary/30' :
                      record.type === 'ATTENDED' ? 'bg-primary-fixed/20 text-primary border-primary/30' :
                      'bg-tertiary-container/20 text-tertiary border-tertiary/30'
                    }`}>
                      {record.category}
                    </span>
                  </td>
                  <td className="px-md py-4">
                    <div className="font-semibold text-primary">{record.title || "Untitled"}</div>
                  </td>
                  <td className="px-md py-4 text-gray-600">
                    {record.date ? new Date(record.date).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-md py-4 text-gray-600">
                    {record.faculty || "Unknown Faculty"}
                  </td>
                  <td className="px-md py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === record.id ? null : record.id)}
                        className="text-gray-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100"
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      
                      {activeDropdown === record.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 shadow-2xl z-50 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <a 
                              href={`/activities?tab=${record.type === 'ORGANIZED' ? 'organized' : record.type === 'ATTENDED' ? 'attended' : 'support'}&editId=${record.id}`}
                              className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                            >
                              <span className="material-symbols-outlined text-blue-600">edit</span>
                              Edit Activity
                            </a>
                            {(record as any).evidence_url ? (
                              <a 
                                href={(record as any).evidence_url} 
                                target="_blank"
                                className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-green-600">cloud_download</span>
                                Supporting Files
                              </a>
                            ) : (
                              <span className="flex items-center gap-3 px-5 py-4 text-sm font-bold text-gray-300 cursor-not-allowed">
                                <span className="material-symbols-outlined">block</span>
                                No Files Attached
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-md py-8 text-center text-gray-500">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-md py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs font-label-caps text-gray-500">Showing {records.length} records</span>
          <div className="flex gap-1">
            <button className="p-1 border border-gray-200 bg-white text-gray-400 hover:text-primary disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="px-3 py-1 border border-primary bg-primary text-white text-xs font-bold rounded-sm">1</button>
            <button className="p-1 border border-gray-200 bg-white text-gray-400 hover:text-primary disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
