import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Komponen Chart untuk memisahkan logika tiap grafik
const ChartComponent = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(data);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let results = data.filter((item) =>
      item.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      results = results.filter((item) => {
        const itemDate = new Date(item.name);
        return itemDate >= start && itemDate <= end;
      });
    }

    setFilteredData(results);
  }, [searchTerm, startDate, endDate, data]);

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      {/* Search & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
        <input
          type="text"
          placeholder="Search Database"
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex space-x-2">
          <input
            type="date"
            className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-xl">→</span>
          <input
            type="date"
            className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="w-full bg-gray-50 p-4 rounded-lg shadow-lg">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={filteredData}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip />
            <Area type="monotone" dataKey="sizeKB" stroke="#2563eb" fill="#93c5fd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/file-size")
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((item) => ({
          name: item.date,
          sizeKB: item.sizeKB,
          filename: item.filename,
        }));
        setData(formattedData);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white bg-blue-800 p-4 rounded-lg">
          Monitoring Data Center
        </h1>
      </div>

      {/* Grid Layout untuk 4 Graph */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, index) => (
          <ChartComponent key={index} data={data} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
