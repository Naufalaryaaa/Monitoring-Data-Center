import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch("http://localhost:8080/file-size")
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((item, index) => ({
          name: item.date, // Sesuai dengan tanggal dari backend
          sizeKB: item.sizeKB,
          filename: item.filename,
        }));
        setData(formattedData);
        setFilteredData(formattedData);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  useEffect(() => {
    let results = data.filter((item) =>
      item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      results = results.filter((item) => {
        const itemDate = new Date(item.name); // Pastikan format tanggal sesuai
        return itemDate >= start && itemDate <= end;
      });
    }

    console.log("Filtered Data:", results); // Debugging
    setFilteredData(results);
  }, [searchTerm, startDate, endDate, data]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-800">Monitoring Data Center</h1>
        </div>

        {/* Date Pickers & Search Bar */}
        <div className="flex justify-center space-x-4 mb-6">
          <input
            type="date"
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search database..."
            className="w-1/3 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:ring-blue-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Chart */}
        <div className="w-full bg-gray-50 p-4 rounded-lg shadow-lg">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
              <Tooltip />
              <Area type="monotone" dataKey="sizeKB" stroke="#2563eb" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
