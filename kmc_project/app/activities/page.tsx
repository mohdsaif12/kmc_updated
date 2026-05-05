"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabase";

const DEPARTMENTS = [
  "Faculty of Arts & Humanities",
  "Faculty of Engineering & Technology",
  "Faculty of Social Science",
  "Faculty of Science",
  "Faculty of Legal Studies",
  "Faculty of Commerce & Management",
  "Faculty of Pharmacy"
];

function ActivitiesContent() {
  const [activeTab, setActiveTab] = useState("organized");
  const searchParams = useSearchParams();
  const [initialEditId, setInitialEditId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const editId = searchParams.get('editId');
    if (tab) setActiveTab(tab);
    if (editId) setInitialEditId(editId);
  }, [searchParams]);

  const [loading, setLoading] = useState(false);

  // State for Organized
  const [organizedEntries, setOrganizedEntries] = useState<any[]>([]);
  // State for Attended
  const [attendedEntries, setAttendedEntries] = useState<any[]>([]);
  // State for Student Support
  const [supportEntries, setSupportEntries] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Fetch all data on load
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching data from Supabase...");
      const { data: organized, error: error1 } = await supabase.from('activities_organized').select('*').order('created_at', { ascending: false });
      const { data: attended, error: error2 } = await supabase.from('activities_attended').select('*').order('created_at', { ascending: false });
      const { data: support, error: error3 } = await supabase.from('student_support_activities').select('*').order('created_at', { ascending: false });

      if (error1 || error2 || error3) {
        throw new Error(error1?.message || error2?.message || error3?.message || "Database error");
      }

      if (organized) setOrganizedEntries(organized);
      if (attended) setAttendedEntries(attended);
      if (support) setSupportEntries(support);
    } catch (err: any) {
      console.error("Supabase Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-8">
        <div>
          <h2 className="text-4xl font-extrabold text-[#800000]">Academic Activities</h2>
          <p className="text-gray-500 mt-2 text-lg">Centralized management of all university audit records.</p>
        </div>
        <div className="flex items-center gap-4">
          {loading && <div className="text-[#B23B25] font-bold animate-pulse">Syncing...</div>}
          {error && (
            <button
              onClick={fetchData}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 hover:bg-red-100 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-red-700 font-bold">Database Connection Error</p>
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-xs text-red-400 mt-2 italic">Check if your Supabase URL and Anon Key are correct in .env.local and that you've run the SQL code to create tables.</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab("organized")}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'organized' ? 'bg-[#B23B25] text-white shadow-lg' : 'text-gray-600 hover:bg-white'}`}
        >
          1. Activities Organized
        </button>
        <button
          onClick={() => setActiveTab("attended")}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'attended' ? 'bg-[#B23B25] text-white shadow-lg' : 'text-gray-600 hover:bg-white'}`}
        >
          2. Activities Attended
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'support' ? 'bg-[#B23B25] text-white shadow-lg' : 'text-gray-600 hover:bg-white'}`}
        >
          3. Student Support
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="space-y-12">
        {activeTab === "organized" && (
          <OrganizedModule entries={organizedEntries} onRefresh={fetchData} initialEditId={initialEditId} />
        )}
        {activeTab === "attended" && (
          <AttendedModule entries={attendedEntries} onRefresh={fetchData} initialEditId={initialEditId} />
        )}
        {activeTab === "support" && (
          <SupportModule entries={supportEntries} onRefresh={fetchData} initialEditId={initialEditId} />
        )}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold text-[#B23B25]">Loading Dashboard...</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}

// --- MODULE 1: ORGANIZED ---
function OrganizedModule({ entries, onRefresh, initialEditId }: any) {
  const [form, setForm] = useState({ 
    convener: "", 
    title: "", 
    agency: "", 
    startDate: "", 
    endDate: "", 
    participants: "", 
    theme: "",
    department: "",
    file: null as File | null
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditId && entries.length > 0) {
      const entry = entries.find((e: any) => e.id === initialEditId);
      if (entry) handleEdit(entry);
    }
  }, [initialEditId, entries]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    try {
      let fileUrl = form.file ? "" : (entries.find((e: any) => e.id === editingId)?.evidence_url || "");
      
      if (form.file) {
        const fileName = `${Date.now()}-${form.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('activity-evidences')
          .upload(fileName, form.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('activity-evidences')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrl;
      }

      const recordData = {
        convener_name: form.convener,
        program_title: form.title,
        sponsoring_agency: form.agency,
        start_date: form.startDate,
        end_date: form.endDate,
        participants_count: parseInt(form.participants),
        theme: form.theme,
        department: form.department,
        evidence_url: fileUrl
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('activities_organized')
          .update([recordData])
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('activities_organized')
          .insert([recordData]);
        error = insertError;
      }

      if (error) throw error;

      setForm({ convener: "", title: "", agency: "", startDate: "", endDate: "", participants: "", theme: "", department: "", file: null });
      setEditingId(null);
      onRefresh();
      alert(editingId ? "Successfully updated!" : "Successfully saved!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      convener: entry.convener_name || "",
      title: entry.program_title || "",
      agency: entry.sponsoring_agency || "",
      startDate: entry.start_date || "",
      endDate: entry.end_date || "",
      participants: entry.participants_count?.toString() || "",
      theme: entry.theme || "",
      department: entry.department || "",
      file: null
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#B23B25] px-8 py-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-xl">{editingId ? 'Edit Activity' : 'New Organized Activity'}</h3>
          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setForm({ convener: "", title: "", agency: "", startDate: "", endDate: "", participants: "", theme: "", department: "", file: null }); }}
              className="text-white/80 hover:text-white text-sm font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              CANCEL
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
          <FormField label="Convener / Coordinator" value={form.convener} onChange={(v) => setForm({ ...form, convener: v })} />
          <FormField label="Programme Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <FormField label="Sponsoring Agency & Funds" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
          </div>
          <FormField label="Participants" type="number" value={form.participants} onChange={(v) => setForm({ ...form, participants: v })} />
          <FormField label="Themes (SDG / AI)" value={form.theme} onChange={(v) => setForm({ ...form, theme: v })} />
          <div className="md:col-span-2">
            <FileUpload label={editingId ? "Replace Related Files (Optional)" : "Upload Related Files (Image/PDF - Max 5MB)"} onChange={(f) => setForm({ ...form, file: f })} />
          </div>
          <SubmitButton saving={saving} label={editingId ? 'Update Record' : 'Add Record to Dashboard'} />
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Title", "Department", "Convener", "Files", "Agency", "Date Range", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === e.id ? (
                    <td colSpan={7} className="p-0">
                      <div className="bg-blue-50/50 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="md:col-span-3 flex justify-between items-center mb-2">
                          <span className="text-blue-600 font-bold text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">edit</span> EDITING RECORD
                          </span>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <SelectField label="Department" value={form.department} onChange={(v: any) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
                        <FormField label="Convener" value={form.convener} onChange={(v: any) => setForm({ ...form, convener: v })} />
                        <FormField label="Title" value={form.title} onChange={(v: any) => setForm({ ...form, title: v })} />
                        <FormField label="Agency" value={form.agency} onChange={(v: any) => setForm({ ...form, agency: v })} />
                        <FormField label="Start" type="date" value={form.startDate} onChange={(v: any) => setForm({ ...form, startDate: v })} />
                        <FormField label="End" type="date" value={form.endDate} onChange={(v: any) => setForm({ ...form, endDate: v })} />
                        <div className="md:col-span-2">
                          <FileUpload label="Change File (Optional)" onChange={(f) => setForm({ ...form, file: f })} />
                        </div>
                        <div className="flex items-end pb-1">
                          <button 
                            disabled={saving}
                            onClick={handleSubmit}
                            className="w-full bg-[#B23B25] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#800000] transition-all"
                          >
                            {saving ? 'Saving...' : 'SAVE CHANGES'}
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{e.program_title}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.department || '-'}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.convener_name}</td>
                      <td className="px-6 py-5 text-sm">
                        {e.evidence_url ? (
                          <a href={e.evidence_url} target="_blank" className="text-[#B23B25] hover:underline font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">link</span> VIEW
                          </a>
                        ) : <span className="text-gray-300">NONE</span>}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.sponsoring_agency}</td>
                      <td className="px-6 py-5 text-xs text-gray-500 font-mono">
                        {e.start_date} <br/> {e.end_date}
                      </td>
                      <td className="px-6 py-5">
                        <button onClick={() => handleEdit(e)} className="p-2 rounded-lg hover:bg-gray-100 text-[#B23B25] transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MODULE 2: ATTENDED ---
function AttendedModule({ entries, onRefresh, initialEditId }: any) {
  const [form, setForm] = useState({ 
    teacher: "", 
    title: "", 
    institution: "", 
    startDate: "", 
    endDate: "",
    department: "",
    file: null as File | null
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditId && entries.length > 0) {
      const entry = entries.find((e: any) => e.id === initialEditId);
      if (entry) handleEdit(entry);
    }
  }, [initialEditId, entries]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      let fileUrl = form.file ? "" : (entries.find((e: any) => e.id === editingId)?.evidence_url || "");
      
      if (form.file) {
        const fileName = `${Date.now()}-${form.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('activity-evidences')
          .upload(fileName, form.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('activity-evidences')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrl;
      }

      const recordData = {
        teacher_name: form.teacher,
        program_title: form.title,
        organizing_institution: form.institution,
        start_date: form.startDate,
        end_date: form.endDate,
        department: form.department,
        evidence_url: fileUrl
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('activities_attended')
          .update([recordData])
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('activities_attended')
          .insert([recordData]);
        error = insertError;
      }

      if (error) throw error;

      setForm({ teacher: "", title: "", institution: "", startDate: "", endDate: "", department: "", file: null });
      setEditingId(null);
      onRefresh();
      alert(editingId ? "Successfully updated!" : "Successfully saved!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      teacher: entry.teacher_name || "",
      title: entry.program_title || "",
      institution: entry.organizing_institution || "",
      startDate: entry.start_date || "",
      endDate: entry.end_date || "",
      department: entry.department || "",
      file: null
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#B23B25] px-8 py-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-xl">{editingId ? 'Edit Activity' : 'New Attended Activity'}</h3>
          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setForm({ teacher: "", title: "", institution: "", startDate: "", endDate: "", department: "", file: null }); }}
              className="text-white/80 hover:text-white text-sm font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              CANCEL
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
          <FormField label="Name of Teacher" value={form.teacher} onChange={(v) => setForm({ ...form, teacher: v })} />
          <FormField label="Title of Programme" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <FormField label="Organizing Institution" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
          </div>
          <div className="md:col-span-2">
            <FileUpload label={editingId ? "Replace Related Files (Optional)" : "Upload Related Files (Image/PDF - Max 5MB)"} onChange={(f) => setForm({ ...form, file: f })} />
          </div>
          <SubmitButton saving={saving} label={editingId ? 'Update Record' : 'Add Record to Dashboard'} />
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Title", "Department", "Teacher", "Files", "Institution", "Date Range", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === e.id ? (
                    <td colSpan={7} className="p-0">
                      <div className="bg-blue-50/50 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="md:col-span-3 flex justify-between items-center mb-2">
                          <span className="text-blue-600 font-bold text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">edit</span> EDITING RECORD
                          </span>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <SelectField label="Department" value={form.department} onChange={(v: any) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
                        <FormField label="Teacher" value={form.teacher} onChange={(v: any) => setForm({ ...form, teacher: v })} />
                        <FormField label="Title" value={form.title} onChange={(v: any) => setForm({ ...form, title: v })} />
                        <FormField label="Institution" value={form.institution} onChange={(v: any) => setForm({ ...form, institution: v })} />
                        <FormField label="Start" type="date" value={form.startDate} onChange={(v: any) => setForm({ ...form, startDate: v })} />
                        <FormField label="End" type="date" value={form.endDate} onChange={(v: any) => setForm({ ...form, endDate: v })} />
                        <div className="md:col-span-2">
                          <FileUpload label="Change File (Optional)" onChange={(f) => setForm({ ...form, file: f })} />
                        </div>
                        <div className="flex items-end pb-1">
                          <button 
                            disabled={saving}
                            onClick={handleSubmit}
                            className="w-full bg-[#B23B25] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#800000] transition-all"
                          >
                            {saving ? 'Saving...' : 'SAVE CHANGES'}
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{e.program_title}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.department || '-'}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.teacher_name}</td>
                      <td className="px-6 py-5 text-sm">
                        {e.evidence_url ? (
                          <a href={e.evidence_url} target="_blank" className="text-[#B23B25] hover:underline font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">link</span> VIEW
                          </a>
                        ) : <span className="text-gray-300">NONE</span>}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.organizing_institution}</td>
                      <td className="px-6 py-5 text-xs text-gray-500 font-mono">
                        {e.start_date} <br/> {e.end_date}
                      </td>
                      <td className="px-6 py-5">
                        <button onClick={() => handleEdit(e)} className="p-2 rounded-lg hover:bg-gray-100 text-[#B23B25] transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- MODULE 3: STUDENT SUPPORT ---
function SupportModule({ entries, onRefresh, initialEditId }: any) {
  const [form, setForm] = useState({ 
    activity: "", 
    purpose: "", 
    coordinator: "", 
    funds: "", 
    students: "",
    department: "",
    file: null as File | null
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditId && entries.length > 0) {
      const entry = entries.find((e: any) => e.id === initialEditId);
      if (entry) handleEdit(entry);
    }
  }, [initialEditId, entries]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      let fileUrl = form.file ? "" : (entries.find((e: any) => e.id === editingId)?.evidence_url || "");
      
      if (form.file) {
        const fileName = `${Date.now()}-${form.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('activity-evidences')
          .upload(fileName, form.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('activity-evidences')
          .getPublicUrl(fileName);
        
        fileUrl = publicUrl;
      }

      const recordData = {
        activity_name: form.activity,
        purpose: form.purpose,
        coordinator_name: form.coordinator,
        funds_utilized: form.funds,
        students_engaged: parseInt(form.students),
        department: form.department,
        evidence_url: fileUrl
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('student_support_activities')
          .update([recordData])
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('student_support_activities')
          .insert([recordData]);
        error = insertError;
      }

      if (error) throw error;

      setForm({ activity: "", purpose: "", coordinator: "", funds: "", students: "", department: "" , file: null });
      setEditingId(null);
      onRefresh();
      alert(editingId ? "Successfully updated!" : "Successfully saved!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setForm({
      activity: entry.activity_name || "",
      purpose: entry.purpose || "",
      coordinator: entry.coordinator_name || "",
      funds: entry.funds_utilized || "",
      students: entry.students_engaged?.toString() || "",
      department: entry.department || "",
      file: null
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#B23B25] px-8 py-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-xl">{editingId ? 'Edit Activity' : 'New Student Support Activity'}</h3>
          {editingId && (
            <button 
              onClick={() => { setEditingId(null); setForm({ activity: "", purpose: "", coordinator: "", funds: "", students: "", department: "" , file: null }); }}
              className="text-white/80 hover:text-white text-sm font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              CANCEL
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
          <FormField label="Name of Activity" value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} />
          <FormField label="Purpose" value={form.purpose} onChange={(v) => setForm({ ...form, purpose: v })} />
          <FormField label="Programme Coordinator" value={form.coordinator} onChange={(v) => setForm({ ...form, coordinator: v })} />
          <FormField label="Funds Utilized" value={form.funds} onChange={(v) => setForm({ ...form, funds: v })} />
          <FormField label="Students Engaged" type="number" value={form.students} onChange={(v) => setForm({ ...form, students: v })} />
          <div className="md:col-span-2">
            <FileUpload label={editingId ? "Replace Related Files (Optional)" : "Upload Related Files (Image/PDF - Max 5MB)"} onChange={(f) => setForm({ ...form, file: f })} />
          </div>
          <SubmitButton saving={saving} label={editingId ? 'Update Record' : 'Add Record to Dashboard'} />
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Activity Name", "Department", "Files", "Coordinator", "Funds", "Students", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === e.id ? (
                    <td colSpan={7} className="p-0">
                      <div className="bg-blue-50/50 p-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="md:col-span-3 flex justify-between items-center mb-2">
                          <span className="text-blue-600 font-bold text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">edit</span> EDITING RECORD
                          </span>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        <SelectField label="Department" value={form.department} onChange={(v: any) => setForm({ ...form, department: v })} options={DEPARTMENTS} />
                        <FormField label="Activity Name" value={form.activity} onChange={(v: any) => setForm({ ...form, activity: v })} />
                        <FormField label="Coordinator" value={form.coordinator} onChange={(v: any) => setForm({ ...form, coordinator: v })} />
                        <FormField label="Funds" value={form.funds} onChange={(v: any) => setForm({ ...form, funds: v })} />
                        <FormField label="Students" type="number" value={form.students} onChange={(v: any) => setForm({ ...form, students: v })} />
                        <div className="md:col-span-2">
                          <FileUpload label="Change File (Optional)" onChange={(f) => setForm({ ...form, file: f })} />
                        </div>
                        <div className="flex items-end pb-1">
                          <button 
                            disabled={saving}
                            onClick={handleSubmit}
                            className="w-full bg-[#B23B25] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#800000] transition-all"
                          >
                            {saving ? 'Saving...' : 'SAVE CHANGES'}
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{e.activity_name}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.department || '-'}</td>
                      <td className="px-6 py-5 text-sm">
                        {e.evidence_url ? (
                          <a href={e.evidence_url} target="_blank" className="text-[#B23B25] hover:underline font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">link</span> VIEW
                          </a>
                        ) : <span className="text-gray-300">NONE</span>}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.coordinator_name}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.funds_utilized}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{e.students_engaged}</td>
                      <td className="px-6 py-5">
                        <button onClick={() => handleEdit(e)} className="p-2 rounded-lg hover:bg-gray-100 text-[#B23B25] transition-colors">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, onChange }: { label: string, onChange: (file: File | null) => void }) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError("");
    
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit!");
        setFileName("");
        onChange(null);
        return;
      }
      setFileName(file.name);
      onChange(file);
    } else {
      setFileName("");
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-[#B23B25] hover:bg-gray-50'}`}>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept="image/*,.pdf"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <span className="material-symbols-outlined text-gray-400 text-4xl">
            {fileName ? 'task_alt' : 'cloud_upload'}
          </span>
          <p className="text-sm font-medium text-gray-500">
            {fileName ? <span className="text-[#B23B25]">{fileName}</span> : 'Click or drag to upload file'}
          </p>
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// --- REUSABLE COMPONENTS ---

function FormField({ label, type = "text", value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <input
        required
        type={type}
        placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#B23B25] focus:border-transparent outline-none transition-all shadow-sm hover:border-gray-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <select
        required
        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#B23B25] focus:border-transparent outline-none transition-all shadow-sm hover:border-gray-300 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function SubmitButton({ saving, label }: { saving: boolean, label?: string }) {
  return (
    <div className="md:col-span-2 pt-4">
      <button
        disabled={saving}
        type="submit"
        className={`w-full ${saving ? 'bg-gray-400' : 'bg-[#B23B25] hover:bg-[#800000]'} text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-[#B23B25]/20 transition-all transform hover:-translate-y-1 active:scale-95`}
      >
        {saving ? 'Saving...' : (label || 'Add Record to Dashboard')}
      </button>
    </div>
  );
}

