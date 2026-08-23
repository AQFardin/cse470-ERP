import { useEffect, useState } from "react";

const API = "http://localhost:3001/api";

const CURRENT_EMPLOYEE_ID =
  "346c3869-51a5-4255-a777-d944f19ea7de";

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

  const loadMessages = async () => {
    const response = await fetch(
      `${API}/messages?employeeId=${CURRENT_EMPLOYEE_ID}`
    );

    if (!response.ok) {
      throw new Error("Failed to load messages");
    }

    setMessages(await response.json());
  };

  const loadEmployees = async () => {
    const response = await fetch(`${API}/employees`);

    if (!response.ok) {
      throw new Error("Failed to load employees");
    }

    const result = await response.json();

    setEmployees(
      result.data.filter(
        (employee: Employee) =>
          employee.id !== CURRENT_EMPLOYEE_ID
      )
    );
  };

  useEffect(() => {
    Promise.all([
      loadMessages(),
      loadEmployees(),
    ]).catch(console.error);
  }, []);

  // =========================
  // INTERNAL MESSAGE
  // =========================

  const sendInternalMessage = async () => {
    if (!receiverId) {
      alert("Select an employee.");
      return;
    }

    if (!internalContent.trim()) {
      alert("Enter a message.");
      return;
    }

    try {
      setInternalLoading(true);

      const response = await fetch(`${API}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: CURRENT_EMPLOYEE_ID,
          receiverId,
          subject: internalSubject.trim() || null,
          content: internalContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to send internal message"
        );
      }

      setReceiverId("");
      setInternalSubject("");
      setInternalContent("");

      await loadMessages();

      alert("Internal message sent successfully.");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to send internal message."
      );
    } finally {
      setInternalLoading(false);
    }
  };

  // =========================
  // EMAIL
  // =========================

  const sendEmail = async () => {
    if (!email.trim() || !emailContent.trim()) {
      alert("Enter an email address and message.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      setEmailLoading(true);

      const response = await fetch(`${API}/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: CURRENT_EMPLOYEE_ID,
          toEmail: normalizedEmail,
          title:
            emailSubject.trim() || "Message from ERP",
          message: emailContent.trim(),
          type: "INFO",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to send email"
        );
      }

      setEmail("");
      setEmailSubject("");
      setEmailContent("");

      alert(
        `Email sent successfully to ${normalizedEmail}.`
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to send email."
      );
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Communication
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Send internal messages and email notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* INTERNAL MESSAGING */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">
            Internal Message
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Employee
            </label>

            <select
              value={receiverId}
              onChange={(e) =>
                setReceiverId(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">
                Select employee
              </option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.firstName}{" "}
                  {employee.lastName}{" "}
                  ({employee.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Subject
            </label>

            <input
              value={internalSubject}
              onChange={(e) =>
                setInternalSubject(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Message subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Message
            </label>

            <textarea
              value={internalContent}
              onChange={(e) =>
                setInternalContent(e.target.value)
              }
              rows={5}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Write your internal message..."
            />
          </div>

          <button
            onClick={sendInternalMessage}
            disabled={internalLoading}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50"
          >
            {internalLoading
              ? "Sending..."
              : "Send Internal Message"}
          </button>
        </div>

        {/* EMAIL */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">
            Email Notification
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="example@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Subject
            </label>

            <input
              value={emailSubject}
              onChange={(e) =>
                setEmailSubject(e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Message
            </label>

            <textarea
              value={emailContent}
              onChange={(e) =>
                setEmailContent(e.target.value)
              }
              rows={5}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Write your email..."
            />
          </div>

          <button
            onClick={sendEmail}
            disabled={emailLoading}
            className="px-5 py-2 rounded-lg bg-purple-600 text-white font-medium disabled:opacity-50"
          >
            {emailLoading
              ? "Sending..."
              : "Send Email"}
          </button>
        </div>

      </div>

      {/* INTERNAL MESSAGE INBOX */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-4">
          Internal Messages
        </h2>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">
            No messages yet.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="border rounded-lg p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {message.sender.firstName}{" "}
                      {message.sender.lastName}
                    </p>

                    {message.subject && (
                      <p className="text-sm font-medium mt-1">
                        {message.subject}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-gray-400">
                    {new Date(
                      message.createdAt
                    ).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}