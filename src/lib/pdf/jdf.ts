/**
 * Genera un archivo JDF (Job Definition Format) para integración con RIP/MIS.
 * Basado en CIP4 JDF 1.8.
 */
export function generateJDF(
  fileName: string,
  pageCount: number,
  sheetWidth: number,
  sheetHeight: number,
  totalSheets: number,
  impositionType: string,
): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<JDF xmlns="http://www.CIP4.org/JDFSchema_1_1" Type="ProcessGroup" ID="JDF_${Date.now()}" Version="1.3">
  <ResourcePool>
    <Layout Intent="Production" ID="LAYOUT_1">
      <LayoutIntent>
        <SheetIntent Size="${sheetWidth} ${sheetHeight}" />
      </LayoutIntent>
    </Layout>
    <Component ID="COMP_1" ComponentType="Final" />
  </ResourcePool>
  <ResourceLinkPool>
    <LayoutLink rRef="LAYOUT_1" Usage="Input" />
  </ResourceLinkPool>
  <JDF Type="Imposition" ID="IMP_1">
    <ResourcePool>
      <ImpositionParams ID="IMP_PARAMS_1">
        <Media Source="Sheet" Size="${sheetWidth} ${sheetHeight}" />
        <LayoutIntent>
          <SheetIntent Size="${sheetWidth} ${sheetHeight}" />
        </LayoutIntent>
      </ImpositionParams>
    </ResourcePool>
    <AuditPool>
      <Created AgentName="MAQUETADOR" AgentVersion="1.0" TimeStamp="${now}" />
    </AuditPool>
  </JDF>
  <Comment>Imposición: ${impositionType}, ${pageCount} páginas, ${totalSheets} pliegos. Archivo: ${fileName}</Comment>
</JDF>`;
}