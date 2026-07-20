# Envia bytes raw (ZPL/TSPL) para uma impressora Windows via Spooler.
# Uso: powershell -File send-raw.ps1 -PrinterName "Nome" -FilePath "C:\temp\label.zpl"

param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Arquivo nao encontrado: $FilePath"
}

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      throw new Exception("OpenPrinter falhou. Verifique o nome da impressora no Windows.");
    }
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "Diógenes Label";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di)) {
        throw new Exception("StartDocPrinter falhou.");
      }
      try {
        if (!StartPagePrinter(hPrinter)) {
          throw new Exception("StartPagePrinter falhou.");
        }
        try {
          IntPtr pUnmanaged = Marshal.AllocCoTaskMem(bytes.Length);
          try {
            Marshal.Copy(bytes, 0, pUnmanaged, bytes.Length);
            int written;
            if (!WritePrinter(hPrinter, pUnmanaged, bytes.Length, out written)) {
              throw new Exception("WritePrinter falhou.");
            }
          } finally {
            Marshal.FreeCoTaskMem(pUnmanaged);
          }
        } finally {
          EndPagePrinter(hPrinter);
        }
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
[RawPrinterHelper]::SendBytes($PrinterName, $bytes)
Write-Output "OK bytes=$($bytes.Length) printer=$PrinterName"
