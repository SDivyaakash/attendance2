import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import AttendanceReportTable from "../components/AttendanceReportTable";

export default function TeacherAttendanceReport() {
  const { id } = useParams();
  return (
    <Layout>
      <AttendanceReportTable
        reportUrl={`/teacher/subjects/${id}/attendance-report`}
        csvUrl={`/teacher/subjects/${id}/attendance-report.csv`}
        backTo={`/teacher/subjects/${id}`}
        backLabel="Back to subject"
      />
    </Layout>
  );
}
