import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import AttendanceReportTable from "../components/AttendanceReportTable";

export default function PrincipalSubjectReport() {
  const { deptId, subjectId } = useParams();
  return (
    <Layout>
      <AttendanceReportTable
        reportUrl={`/principal/departments/${deptId}/subjects/${subjectId}/attendance-report`}
        csvUrl={`/principal/departments/${deptId}/subjects/${subjectId}/attendance-report.csv`}
        backTo={`/principal/departments/${deptId}`}
        backLabel="Back to department"
      />
    </Layout>
  );
}
