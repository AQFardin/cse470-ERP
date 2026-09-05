import { useEffect, useState } from "react";

const API = "http://localhost:3001/api";

const VALID_USER_ID = "1a5e13d2-f024-473f-8656-305743c5d612";
const VALID_EMPLOYEE_ID = "a633d700-003c-43b6-aadf-ad99b080dee9";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: Employee;
  receiver: Employee;
};

export default function MessagesView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [receiverId, setReceiverId] = useState("");
  const [email, setEmail] = useState("");

  const [internalSubject, setInternalSubject] = useState("");
  const [internalContent, setInternalContent] = useState("");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");

  const [internalLoading, setInternalLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
    return {
      "x-current-user-id": VALID_USER_ID,
      "x-current-employee-id": VALID_EMPLOYEE_ID,
      ...additionalHeaders,
    };
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `${API}/messages?employeeId=${VALID_EMPLOYEE_ID}`,
        {
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      setMessages(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(`${API}/employees`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to load employees");
      }

      const result = await response.json();
      const rawList = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];

      setEmployees(
        rawList.filter((e: Employee) => e.id !== VALID_EMPLOYEE_ID)
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadMessages();
    loadEmployees();
  }, []);

  const sendInternalMessage = async () => {
    if (!receiverId || !internalContent.trim()) {
      alert("Please select a receiver and enter a message.");
      return;
    }

    try {
      setInternalLoading(true);

      const response = await fetch(`${API}/messages`, {
        method: "POST",
        headers: getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          senderId: VALID_EMPLOYEE_ID,
          receiverId,
          subject: internalSubject.trim() || null,
          content: internalContent.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to send internal message");
      }

      setInternalSubject("");
      setInternalContent("");
      setReceiverId("");
      alert("Internal message sent successfully!");
      loadMessages();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setInternalLoading(false);
    }
  };

  const sendEmailNotification = async () => {
    if (!email || !emailSubject.trim() || !emailContent.trim()) {
      alert("Please enter recipient email, subject, and content.");
      return;
    }

    try {
      setEmailLoading(true);

      const response = await fetch(`${API}/messages/email`, {
        method: "POST",
        headers: getHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          to: email.trim(),
          subject: emailSubject.trim(),
          content: emailContent.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to send email");
      }

      setEmail("");
      setEmailSubject("");
      setEmailContent("");
      alert("Email sent successfully!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Communication</h1>
        <p className="text-gray-500 mt-1">
          Send internal messages and email notifications.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Internal Message</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={internalSubject}
                onChange={(e) => setInternalSubject(e.target.value)}
                placeholder="Message subject"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={internalContent}
                onChange={(e) => setInternalContent(e.target.value)}
                rows={4}
                placeholder="Write your internal message..."
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <button
              onClick={sendInternalMessage}
              disabled={internalLoading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {internalLoading ? "Sending..." : "Send Internal Message"}
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Email Notification</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={4}
                placeholder="Write your email..."
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <button
              onClick={sendEmailNotification}
              disabled={emailLoading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {emailLoading ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Internal Messages</h2>

        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                  <span>
                    From: {msg.sender.firstName} {msg.sender.lastName}
                  </span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                {msg.subject && (
                  <div className="font-semibold text-gray-800 mb-1">
                    {msg.subject}
                  </div>
                )}
                <p className="text-gray-600 text-sm">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}