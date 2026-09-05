import { useEffect, useState } from "react";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Participant = {
  id: string;
  employee: Employee;
};

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  createdBy: Employee;
  participants: Participant[];
};

const CURRENT_EMPLOYEE_ID = "346c3869-51a5-4255-a777-d944f19ea7de";

export default function CalendarView() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [startTimeVal, setStartTimeVal] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTimeVal, setEndTimeVal] = useState("");

  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  const loadData = async () => {
    try {
      const [meetingsResponse, employeesResponse] = await Promise.all([
        fetch(
          `http://localhost:3001/api/meetings?employeeId=${CURRENT_EMPLOYEE_ID}`
        ),
        fetch("http://localhost:3001/api/employees"),
      ]);

      if (!meetingsResponse.ok) {
        throw new Error("Failed to load meetings");
      }

      if (!employeesResponse.ok) {
        throw new Error("Failed to load employees");
      }

      const meetingsData = await meetingsResponse.json();
      const employeesData = await employeesResponse.json();

      setMeetings(meetingsData);
      const employeeList = Array.isArray(employeesData.data)
        ? employeesData.data
        : [];

      setEmployees(employeeList);
    } catch (error) {
      console.error("Calendar load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleParticipant = (employeeId: string) => {
    setParticipantIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const createMeeting = async () => {
    if (!title.trim()) {
      alert("Please enter a meeting title.");
      return;
    }

    if (!startDate || !startTimeVal || !endDate || !endTimeVal) {
      alert("Please select both date and time for start and end.");
      return;
    }

    const start = new Date(`${startDate}T${startTimeVal}`);
    const end = new Date(`${endDate}T${endTimeVal}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      alert("Please enter valid dates and times.");
      return;
    }

    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          createdById: CURRENT_EMPLOYEE_ID,
          participantIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create meeting");
      }

      alert("Meeting scheduled successfully!");

      setTitle("");
      setDescription("");
      setStartDate("");
      setStartTimeVal("");
      setEndDate("");
      setEndTimeVal("");
      setParticipantIds([]);
      setParticipantSearch("");

      await loadData();
    } catch (error) {
      console.error("Create meeting error:", error);
      alert(
        error instanceof Error ? error.message : "Could not create meeting."
      );
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm("Delete this meeting?")) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/meetings/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete meeting");
      }

      await loadData();
    } catch (error) {
      console.error("Delete meeting error:", error);
      alert(
        error instanceof Error ? error.message : "Could not delete meeting."
      );
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  const filteredEmployees = employees
    .filter((employee) => employee.id !== CURRENT_EMPLOYEE_ID)
    .filter((employee) => {
      const fullName =
        `${employee.firstName} ${employee.lastName}`.toLowerCase();
      return fullName.includes(participantSearch.toLowerCase());
    });

  if (loading) {
    return <div className="p-8 text-gray-600">Loading calendar...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shared Calendar</h1>
        <p className="text-gray-500 mt-1">
          Schedule and manage meetings with employees.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-5">Schedule Meeting</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Meeting Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team meeting"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Participants
            </label>
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full border rounded-lg px-3 py-2 mb-2"
            />

            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  No employees found.
                </div>
              ) : (
                filteredEmployees.map((employee) => {
                  const selected = participantIds.includes(employee.id);
                  return (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleParticipant(employee.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {employee.firstName} {employee.lastName}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-2 text-sm text-gray-500">
              {participantIds.length === 0
                ? "No participants selected"
                : `${participantIds.length} participant${
                    participantIds.length !== 1 ? "s" : ""
                  } selected`}
            </div>
          </div>

          {/* Start Date & Time */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Start Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 border rounded-lg px-3 py-2 bg-white"
              />
              <select
                value={startTimeVal}
                onChange={(e) => setStartTimeVal(e.target.value)}
                className="w-1/2 border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Select Time</option>
                {Array.from({ length: 48 }).map((_, i) => {
                  const h = Math.floor(i / 2);
                  const m = i % 2 === 0 ? "00" : "30";
                  const hourStr = h.toString().padStart(2, "0");
                  const timeVal = `${hourStr}:${m}`;
                  const displayHour = h % 12 === 0 ? 12 : h % 12;
                  const ampm = h < 12 ? "AM" : "PM";
                  return (
                    <option key={timeVal} value={timeVal}>
                      {displayHour}:{m} {ampm}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* End Date & Time */}
          <div>
            <label className="block text-sm font-medium mb-1">
              End Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 border rounded-lg px-3 py-2 bg-white"
              />
              <select
                value={endTimeVal}
                onChange={(e) => setEndTimeVal(e.target.value)}
                className="w-1/2 border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Select Time</option>
                {Array.from({ length: 48 }).map((_, i) => {
                  const h = Math.floor(i / 2);
                  const m = i % 2 === 0 ? "00" : "30";
                  const hourStr = h.toString().padStart(2, "0");
                  const timeVal = `${hourStr}:${m}`;
                  const displayHour = h % 12 === 0 ? 12 : h % 12;
                  const ampm = h < 12 ? "AM" : "PM";
                  return (
                    <option key={timeVal} value={timeVal}>
                      {displayHour}:{m} {ampm}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting details..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <button
          onClick={createMeeting}
          className="mt-5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          Schedule Meeting
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Meetings</h2>

        {meetings.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
            No meetings scheduled.
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white border rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {meeting.title}
                    </h3>

                    <p className="text-sm text-indigo-600 mt-1">
                      {formatDate(meeting.startTime)}
                    </p>

                    <p className="text-sm text-gray-600">
                      {formatTime(meeting.startTime)} –{" "}
                      {formatTime(meeting.endTime)}
                    </p>

                    {meeting.description && (
                      <p className="text-sm text-gray-600 mt-3">
                        {meeting.description}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mt-3">
                      Created by{" "}
                      <span className="font-medium">
                        {meeting.createdBy.firstName}{" "}
                        {meeting.createdBy.lastName}
                      </span>
                    </p>

                    {meeting.participants.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Participants:{" "}
                        {meeting.participants
                          .map(
                            (participant) =>
                              `${participant.employee.firstName} ${participant.employee.lastName}`
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteMeeting(meeting.id)}
                    className="px-3 py-1.5 text-sm border rounded-lg text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}