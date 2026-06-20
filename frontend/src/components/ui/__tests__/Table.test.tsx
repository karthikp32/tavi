import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table } from "../Table";

interface Row {
  id: string;
  name: string;
}

describe("Table", () => {
  it("renders headers and rows", () => {
    const rows: Row[] = [
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ];

    render(
      <Table<Row>
        columns={[{ key: "name", header: "Name", render: (row) => row.name }]}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
