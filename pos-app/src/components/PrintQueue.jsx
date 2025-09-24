import { useEffect, useState } from "react";
import { offlineStore } from "../core/OfflineDataStore";

export default function PrintQueue() {
  const [jobs, setJobs] = useState([]);

  const refresh = async () => {
    setJobs(await offlineStore.db.printJobs.toArray());
  };

  useEffect(() => {
    refresh();
    offlineStore.on("print:queued", refresh);
  }, []);

  return (
    <div>
      <h3>Print Queue</h3>
      {jobs.map((j) => (
        <div key={j.id}>
          {j.type} – {j.status} – {new Date(j.createdAt).toLocaleTimeString()}
        </div>
      ))}
    </div>
  );
}
