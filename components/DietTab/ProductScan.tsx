'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Barcode, Camera, CameraOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';

interface ProductScanProps {
  open: boolean;
  onClose: () => void;
  onSelect: (productId: string) => void;
}

export function ProductScan({ open, onClose, onSelect }: ProductScanProps) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (open && !scannerRef.current) {
      startScanning();
    } else if (!open && scannerRef.current) {
      stopScanning();
    }

    return () => {
      if (scannerRef.current) {
        stopScanning();
      }
    };
  }, [open]);

  const startScanning = async () => {
    if (!scannerContainerRef.current) return;

    try {
      setCameraError(null);
      setScanning(true);

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser. Please use HTTPS or localhost.');
      }

      const html5QrCode = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Successfully scanned a barcode
          handleScannedBarcode(decodedText);
        },
        (errorMessage) => {
          // Scanning in progress, ignore errors
        }
      );
    } catch (err) {
      console.error('Error starting camera:', err);
      let errorMessage = 'Failed to access camera';
      if (err instanceof Error) {
        if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
          errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.message.includes('NotFoundError') || err.message.includes('no camera')) {
          errorMessage = 'No camera found. Please connect a camera or use manual entry.';
        } else if (err.message.includes('NotReadableError')) {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.message.includes('HTTPS') || err.message.includes('localhost')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }
      setCameraError(errorMessage);
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScannedBarcode = async (scannedBarcode: string) => {
    // Stop scanning once we get a barcode
    await stopScanning();
    
    // Process the scanned barcode
    setBarcode(scannedBarcode);
    await handleScan(scannedBarcode);
  };

  const handleScan = async (barcodeToScan?: string) => {
    const barcodeValue = barcodeToScan || barcode.trim();
    if (!barcodeValue) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcodeValue)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Product not found');
      }

      const product = await response.json();
      if (product.status === 0) {
        throw new Error('Product not found');
      }

      onSelect(product.code || barcodeValue);
      setBarcode('');
      setError(null);
      onClose();
    } catch (error) {
      console.error('Error scanning barcode:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan product');
      // Restart scanning if it was stopped
      if (!scanning && open) {
        startScanning();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const toggleCamera = async () => {
    if (scanning) {
      await stopScanning();
    } else {
      await startScanning();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Camera Scanner */}
          <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
            <div
              id={scannerIdRef.current}
              ref={scannerContainerRef}
              className="w-full h-full"
            />
            
            {/* Scanning Overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg" />
                  
                  {/* Center square */}
                  <div className="absolute inset-0 border-2 border-white/50 rounded-lg" />
                </div>
              </div>
            )}

            {/* Camera not available overlay */}
            {!scanning && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80">
                <CameraOff className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Camera not active</p>
              </div>
            )}

            {/* Error overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 p-4">
                <CameraOff className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm text-center">{cameraError}</p>
                <p className="text-xs text-center mt-2 opacity-75">
                  You can still enter the barcode manually below
                </p>
              </div>
            )}
          </div>

          {/* Camera Toggle Button */}
          <div className="flex justify-center">
            <Button
              onClick={toggleCamera}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              {scanning ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Or enter barcode manually
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <Button 
                onClick={() => handleScan()} 
                disabled={loading || !barcode.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

