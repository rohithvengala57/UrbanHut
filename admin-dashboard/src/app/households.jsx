import { Feather } from "lucide-react";
import React, { useState, useMemo } from "react";

import { useAdminHouseholds } from "../hooks/useAdminManagement";
import { Badge } from "../components/ui/Badge";

const STATUS_COLORS = {
  active: "#10b981",
  inactive: "#64748b",
  suspended: "#ef4444",
};

function HouseholdRow({ household }) {
  return (
    <div className="bg-white p-4 border-b border-slate-100 flex-row items-center">
      <div className="flex-1">
        <p className="font-bold text-slate-900 mb-1">{household.name}</p>
        <div className="flex-row items-center">
          <Feather name="users" size={10} color="#94a3b8" />
          <p className="text-slate-500 text-xs ml-1 mr-3">{household.member_count} members</p>
          <p className="text-slate-400 text-[10px]">
            Created: {new Date(household.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="items-end">
        <Badge 
          label={household.status} 
          color={STATUS_COLORS[household.status] || "#64748b"} 
        />
      </div>
    </div>
  );
}

export default function HouseholdsManagement() {
  const { households, isLoading, error, refetch } = useAdminHouseholds();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);

  const filteredHouseholds = useMemo(() => {
    return (households || []).filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter ? h.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [households, search, statusFilter]);

  if (isLoading && (!households || households.length === 0)) {
    return (
      <div className="flex-1 items-center justify-center bg-slate-50">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex-row items-center bg-slate-100 px-3 py-2 rounded-lg mb-3">
          <Feather name="search" size={18} color="#94a3b8" />
          <input
            className="flex-1 ml-2 text-slate-900 bg-transparent"
            placeholder="Search households..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-row">
          <button 
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-full mr-2 ${!statusFilter ? "bg-sky-600" : "bg-slate-100"}`}
          >
            <p className={`text-xs font-medium ${!statusFilter ? "text-white" : "text-slate-600"}`}>All</p>
          </button>
          {["active", "inactive"].map((status) => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full mr-2 ${statusFilter === status ? "bg-sky-600" : "bg-slate-100"}`}
            >
              <p className={`text-xs font-medium ${statusFilter === status ? "text-white" : "text-slate-600"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        {filteredHouseholds.length > 0 ? (
          filteredHouseholds.map((item) => <HouseholdRow key={item.id} household={item} />)
        ) : (
          <div className="p-8 items-center">
            <p className="text-slate-400">No households found</p>
          </div>
        )}
      </div>
    </div>
  );
}
