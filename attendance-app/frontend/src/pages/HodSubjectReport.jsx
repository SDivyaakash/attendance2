import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import AttendanceReportTable from "../components/AttendanceReportTable";

export default function HodSubjectReport() {
  const { id } = useParams();
  return (
    <Layout>
      <AttendanceReportTable
        reportUrl={`/hod/subjects/${id}/attendance-report`}
        csvUrl={`/hod/subjects/${id}/attendance-report.csv`}
        backTo="/hod"
        backLabel="Back to department"
      />
    </Layout>
  );
}
