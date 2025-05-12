import { useState, useEffect, useRef } from "react";
import { FaBell } from "react-icons/fa";

export default function Notifications() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    fetch("http://localhost:8080/alerts")
      .then((res) => res.json())
      .then((data) => {
        // Pastikan data yang diterima adalah array, bukan null
        if (Array.isArray(data)) {
          setAlerts(data);
        } else {
          console.error("Invalid data format received:", data);
        }
      })
      .catch((err) => {
        console.error("Error fetching alerts:", err);
        setAlerts([]); // Menangani error dengan menampilkan array kosong
      });
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative focus:outline-none"
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaBell className="text-2xl text-white" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg z-20">
          <div className="p-2 border-b font-bold text-black">Notifications</div>
          <ul className="max-h-64 overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((a, i) => (
                <li
                  key={i}
                  className="px-4 py-2 hover:bg-gray-100 border-b last:border-none"
                >
                  <div className="font-semi bold text-black">{a.filename}</div>
                  <div className="text-sm text-gray-600">
                    {a.prev}KB → {a.cur}KB
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500">No alerts</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
