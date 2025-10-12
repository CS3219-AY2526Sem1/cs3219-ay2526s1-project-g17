import { useParams } from "react-router";

export const TestPage = () => {
  /**@type {{testId: number}} */
  const params = useParams();

  return (
    <div>
      <h1>Test page {params.testId}</h1>
    </div>
  );
};
