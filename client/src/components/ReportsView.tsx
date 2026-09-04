import { useState } from "react";

const EMPLOYEE_ID = "346c3869-51a5-4255-a777-d944f19ea7de";
const API = "http://localhost:3001/api";

export default function ReportsView() {
  const [module, setModule] = useState("employees");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const buildParams = (format?: string) => {
    const params = new URLSearchParams();

    params.set("employeeId", EMPLOYEE_ID);
    params.set("role", "manager");

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (department) {
      params.set("department", department);
    }

    if (status) {
      params.set("status", status);
    }

    if (format) {
      params.set("format", format);
    }

    return params.toString();
  };

  const applyFilters = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/reports/${module}?${buildParams()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load report");
      }

      const result = await response.json();

      console.log("Filtered report:", result);

      alert(`Found ${result.count} records.`);
    } catch (error) {
      console.error(error);
      alert("Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: string) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/reports/${module}/export?${buildParams(format)}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${module}-report.${format === "excel" ? "xlsx" : format}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Advanced Reporting & Data Export
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Filter authorized data and export reports in CSV, Excel, or PDF.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Module
            </label>

            <select
              value={module}
              onChange={(e) => {
                setModule(e.target.value);
                setStatus("");
                setDepartment("");
              }}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="employees">
                Employees
              </option>

              <option value="tasks">
                Tasks
              </option>

              <option value="leave-requests">
                Leave Requests
              </option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Search
            </label>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Department */}
          {module === "employees" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Department
              </label>

              <select
                value={department}
                onChange={(e) =>
                  setDepartment(e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">
                  All Departments
                </option>

                <option value="ENGINEERING">
                  Engineering
                </option>

                <option value="HR">
                  HR
                </option>

                <option value="FINANCE">
                  Finance
                </option>

                <option value="MARKETING">
                  Marketing
                </option>

                <option value="SALES">
                  Sales
                </option>

                <option value="OPERATIONS">
                  Operations
                </option>
              </select>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Status
            </label>

            <input
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              placeholder="Optional status"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Apply */}
        <button
          onClick={applyFilters}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50"
        >
          {loading ? "Loading..." : "Apply Filters"}
        </button>

        {/* Export */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-3">
            Export Report
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                exportReport("csv")
              }
              disabled={loading}
              className="px-4 py-2 rounded-lg border bg-gray-50"
            >
              CSV
            </button>

            <button
              onClick={() =>
                exportReport("excel")
              }
              disabled={loading}
              className="px-4 py-2 rounded-lg border bg-gray-50"
            >
              Excel
            </button>

            <button
              onClick={() =>
                exportReport("pdf")
              }
              disabled={loading}
              className="px-4 py-2 rounded-lg border bg-gray-50"
            >
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}