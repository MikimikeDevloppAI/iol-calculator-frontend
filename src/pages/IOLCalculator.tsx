import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2, Download, Image, User, Calculator, RefreshCw, AlertCircle, Info, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractIOLDataFromPdf, type IOLData } from "@/utils/pdfTextExtraction";
import { useIOLData } from "@/hooks/useIOLData";

export default function IOLCalculator() {
  // Disclaimer modal state
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [biometryFile, setBiometryFile] = useState<File | null>(null);
  const [ms39File, setMs39File] = useState<File | null>(null);
  const [biometryData, setBiometryData] = useState<IOLData | null>(null);
  const [ms39Data, setMs39Data] = useState<IOLData | null>(null);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationResult, setAutomationResult] = useState<{
    screenshot: string;
    patientData: any;
  } | null>(null);
  const [calculatedImage, setCalculatedImage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [apiRequestData, setApiRequestData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDataExtracted, setIsDataExtracted] = useState(false);
  
  // IOL Selection states
  const [rightEyeManufacturer, setRightEyeManufacturer] = useState<string>('');
  const [rightEyeIOL, setRightEyeIOL] = useState<string>('');
  const [leftEyeManufacturer, setLeftEyeManufacturer] = useState<string>('');
  const [leftEyeIOL, setLeftEyeIOL] = useState<string>('');
  
  // Gender selection state
  const [gender, setGender] = useState<string>('Female');
  
  // Right eye switches
  const [rightEyeToric, setRightEyeToric] = useState<boolean>(false);
  const [rightEyeKeratoconus, setRightEyeKeratoconus] = useState<boolean>(false);
  const [rightEyeArgos, setRightEyeArgos] = useState<boolean>(false);
  const [rightEyePostLasik, setRightEyePostLasik] = useState<boolean>(false);
  
  // Right eye Toric fields
  const [rightEyeK1Axis, setRightEyeK1Axis] = useState<string>('');
  const [rightEyeSIA, setRightEyeSIA] = useState<string>('');
  const [rightEyeIncision, setRightEyeIncision] = useState<string>('');
  
  // Left eye switches
  const [leftEyeToric, setLeftEyeToric] = useState<boolean>(false);
  const [leftEyeKeratoconus, setLeftEyeKeratoconus] = useState<boolean>(false);
  const [leftEyeArgos, setLeftEyeArgos] = useState<boolean>(false);
  const [leftEyePostLasik, setLeftEyePostLasik] = useState<boolean>(false);
  
  // Left eye Toric fields
  const [leftEyeK1Axis, setLeftEyeK1Axis] = useState<string>('');
  const [leftEyeSIA, setLeftEyeSIA] = useState<string>('');
  const [leftEyeIncision, setLeftEyeIncision] = useState<string>('');

  // Handle manufacturer selection with auto-sync
  const handleRightEyeManufacturerChange = (value: string) => {
    setRightEyeManufacturer(value);
    setRightEyeIOL(''); // Reset IOL selection when manufacturer changes
  };

  const handleLeftEyeManufacturerChange = (value: string) => {
    setLeftEyeManufacturer(value);
    setLeftEyeIOL(''); // Reset IOL selection when manufacturer changes
  };

  const handleRightEyeIOLChange = (value: string) => {
    setRightEyeIOL(value);
  };

  const handleLeftEyeIOLChange = (value: string) => {
    setLeftEyeIOL(value);
  };

  // Check if form is complete for IOL calculation - need at least one eye with manufacturer and IOL
  const isIOLFormComplete = (rightEyeManufacturer && rightEyeIOL) || (leftEyeManufacturer && leftEyeIOL);

  // Function to reset all data for a new IOL calculation
  const resetAllData = () => {
    setIsProcessing(false);
    setBiometryFile(null);
    setMs39File(null);
    setBiometryData(null);
    setMs39Data(null);
    setIsAutomating(false);
    setAutomationResult(null);
    setCalculatedImage(null);
    setShareLink(null);
    setApiRequestData(null);
    setIsCalculating(false);
    setIsDataExtracted(false);
    setRightEyeManufacturer('');
    setRightEyeIOL('');
    setLeftEyeManufacturer('');
    setLeftEyeIOL('');
    
    // Reset gender
    setGender('Female');
    
    // Reset right eye switches
    setRightEyeToric(false);
    setRightEyeKeratoconus(false);
    setRightEyeArgos(false);
    setRightEyePostLasik(false);
    setRightEyeK1Axis('');
    setRightEyeSIA('');
    setRightEyeIncision('');
    
    // Reset left eye switches
    setLeftEyeToric(false);
    setLeftEyeKeratoconus(false);
    setLeftEyeArgos(false);
    setLeftEyePostLasik(false);
    setLeftEyeK1Axis('');
    setLeftEyeSIA('');
    setLeftEyeIncision('');
    
    // Reset HTML file inputs
    const biometryInput = document.getElementById('biometry-upload') as HTMLInputElement;
    const ms39Input = document.getElementById('ms39-upload') as HTMLInputElement;
    if (biometryInput) biometryInput.value = '';
    if (ms39Input) ms39Input.value = '';
  };
  
  const { toast } = useToast();
  const { manufacturers, getIOLsByManufacturer, getToricManufacturers, isLoading: iolDataLoading } = useIOLData();

  // Reset manufacturer/IOL when toric switch changes for right eye
  useEffect(() => {
    if (rightEyeToric) {
      const toricManufacturers = getToricManufacturers();
      const isManufacturerAvailable = toricManufacturers.some(
        m => m.manufacturer === rightEyeManufacturer
      );
      
      if (!isManufacturerAvailable && rightEyeManufacturer) {
        setRightEyeManufacturer('');
        setRightEyeIOL('');
      } else if (rightEyeManufacturer) {
        const availableIOLs = getIOLsByManufacturer(rightEyeManufacturer, true);
        const isIOLAvailable = availableIOLs.some(iol => iol.iol === rightEyeIOL);
        
        if (!isIOLAvailable && rightEyeIOL) {
          setRightEyeIOL('');
        }
      }
    }
  }, [rightEyeToric]);

  // Reset manufacturer/IOL when toric switch changes for left eye
  useEffect(() => {
    if (leftEyeToric) {
      const toricManufacturers = getToricManufacturers();
      const isManufacturerAvailable = toricManufacturers.some(
        m => m.manufacturer === leftEyeManufacturer
      );
      
      if (!isManufacturerAvailable && leftEyeManufacturer) {
        setLeftEyeManufacturer('');
        setLeftEyeIOL('');
      } else if (leftEyeManufacturer) {
        const availableIOLs = getIOLsByManufacturer(leftEyeManufacturer, true);
        const isIOLAvailable = availableIOLs.some(iol => iol.iol === leftEyeIOL);
        
        if (!isIOLAvailable && leftEyeIOL) {
          setLeftEyeIOL('');
        }
      }
    }
  }, [leftEyeToric]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'biometry' | 'ms39') => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (fileType === 'biometry') {
        setBiometryFile(file);
      } else {
        setMs39File(file);
      }
    } else {
      toast({
        title: "Format de fichier incorrect",
        description: "Veuillez sélectionner un fichier PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, fileType: 'biometry' | 'ms39') => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      if (fileType === 'biometry') {
        setBiometryFile(file);
      } else {
        setMs39File(file);
      }
    } else {
      toast({
        title: "Format de fichier incorrect",
        description: "Veuillez déposer un fichier PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleButtonClick = (fileType: 'biometry' | 'ms39') => {
    document.getElementById(`${fileType}-upload`)?.click();
  };

  // Fonction pour fusionner les données de deux sources (MS39 prioritaire, biométrie en fallback)
  const mergeEyeData = (ms39Eye: any, biometryEye: any) => {
    if (!ms39Eye && !biometryEye) return null;
    
    return {
      AL: ms39Eye?.AL || biometryEye?.AL,
      CCT: ms39Eye?.CCT || biometryEye?.CCT,
      AD: ms39Eye?.AD || biometryEye?.AD,
      ACD: ms39Eye?.ACD || biometryEye?.ACD,
      LT: ms39Eye?.LT || biometryEye?.LT,
      K1: ms39Eye?.K1 || biometryEye?.K1,
      K2: ms39Eye?.K2 || biometryEye?.K2,
      K: ms39Eye?.K || biometryEye?.K,
      AST: ms39Eye?.AST || biometryEye?.AST,
      WTW: ms39Eye?.WTW || biometryEye?.WTW,
      targetRefraction: ms39Eye?.targetRefraction || biometryEye?.targetRefraction,
      K1Axis: ms39Eye?.K1Axis || biometryEye?.K1Axis
    };
  };

  const extractIOLData = async () => {
    if (!biometryFile && !ms39File) return;

    setIsProcessing(true);
    setBiometryData(null);
    setMs39Data(null);
    setIsDataExtracted(false);
    setCalculatedImage(null);
    setShareLink(null);
    
    try {
      let biometryResult = null;
      let ms39Result = null;

      // Extraire les données du fichier biométrie s'il existe
      if (biometryFile) {
        console.log("Extraction du fichier biométrie:", biometryFile.name);
        biometryResult = await extractIOLDataFromPdf(biometryFile);
        setBiometryData(biometryResult);
      }

      // Extraire les données du fichier MS 39 s'il existe
      if (ms39File) {
        console.log("Extraction du fichier MS 39:", ms39File.name);
        ms39Result = await extractIOLDataFromPdf(ms39File);
        setMs39Data(ms39Result);
      }

      // Fusionner les données des deux sources (MS39 en priorité, biométrie en fallback)
      let mergedData = null;

      if (ms39Result || biometryResult) {
        mergedData = {
          patientName: ms39Result?.patientName || biometryResult?.patientName || "",
          patientInitials: ms39Result?.patientInitials || biometryResult?.patientInitials || "",
          patientId: ms39Result?.patientId || biometryResult?.patientId || "",
          dateOfBirth: ms39Result?.dateOfBirth || biometryResult?.dateOfBirth || "",
          age: ms39Result?.age || biometryResult?.age || null,
          surgeryType: ms39Result?.surgeryType || biometryResult?.surgeryType || "",
          measurementDate: ms39Result?.measurementDate || biometryResult?.measurementDate || null,
          rightEye: mergeEyeData(ms39Result?.rightEye, biometryResult?.rightEye),
          leftEye: mergeEyeData(ms39Result?.leftEye, biometryResult?.leftEye)
        };
        
        console.log("📊 Merged data from both sources:", mergedData);
      }

      const dataForAPI = mergedData;
      const priorityGeneralData = mergedData;

      if (dataForAPI) {
        // Format data for calculate-iol edge function
        const calculateIOLData = {
          gender: gender,
          top_fields: {
            surgeon: "",
            patient_initials: priorityGeneralData?.patientInitials || "",
            id: priorityGeneralData?.patientId || Date.now().toString(),
            age: priorityGeneralData?.age?.toString() || ""
          },
          right_eye: {
            switches: {
              "Toric": rightEyeToric,
              "Keratoconus": rightEyeKeratoconus,
              "Argos (SoS) AL": rightEyeArgos,
              "Post LASIK/PRK": rightEyePostLasik
            },
            "Manufacturer": rightEyeManufacturer || "HOYA",
            "Select IOL": rightEyeIOL || "XY1-SP",
            AL: dataForAPI.rightEye?.AL || "",
            ACD: dataForAPI.rightEye?.ACD || "",
            LT: dataForAPI.rightEye?.LT || "",
            CCT: dataForAPI.rightEye?.CCT || "",
            "WTW": dataForAPI.rightEye?.WTW || "",
            K1: dataForAPI.rightEye?.K1 || "",
            K2: dataForAPI.rightEye?.K2 || "",
            "Target Refraction": dataForAPI.rightEye?.targetRefraction || "",
            ...(rightEyeToric && rightEyeK1Axis && { "K1 axis": rightEyeK1Axis }),
            ...(rightEyeToric && rightEyeSIA && { "SIA": rightEyeSIA }),
            ...(rightEyeToric && rightEyeIncision && { "Incision": rightEyeIncision })
          },
          left_eye: {
            switches: {
              "Toric": leftEyeToric,
              "Keratoconus": leftEyeKeratoconus,
              "Argos (SoS) AL": leftEyeArgos,
              "Post LASIK/PRK": leftEyePostLasik
            },
            "Manufacturer": leftEyeManufacturer || "HOYA",
            "Select IOL": leftEyeIOL || "XY1-SP",
            AL: dataForAPI.leftEye?.AL || "",
            ACD: dataForAPI.leftEye?.ACD || "",
            LT: dataForAPI.leftEye?.LT || "",
            CCT: dataForAPI.leftEye?.CCT || "",
            "WTW": dataForAPI.leftEye?.WTW || "",
            K1: dataForAPI.leftEye?.K1 || "",
            K2: dataForAPI.leftEye?.K2 || "",
            "Target Refraction": dataForAPI.leftEye?.targetRefraction || "",
            ...(leftEyeToric && leftEyeK1Axis && { "K1 axis": leftEyeK1Axis }),
            ...(leftEyeToric && leftEyeSIA && { "SIA": leftEyeSIA }),
            ...(leftEyeToric && leftEyeIncision && { "Incision": leftEyeIncision })
          }
        };
        
        // Pré-remplir K1 axis TOUJOURS (pas seulement si Toric est activé)
        if (dataForAPI.rightEye?.K1Axis) {
          setRightEyeK1Axis(dataForAPI.rightEye.K1Axis);
          console.log(`✅ Stored right eye K1 axis: ${dataForAPI.rightEye.K1Axis}°`);
        }
        if (dataForAPI.leftEye?.K1Axis) {
          setLeftEyeK1Axis(dataForAPI.leftEye.K1Axis);
          console.log(`✅ Stored left eye K1 axis: ${dataForAPI.leftEye.K1Axis}°`);
        }

        setApiRequestData(calculateIOLData);
        setIsDataExtracted(true);

        toast({
          title: "Extraction réussie",
          description: `Données extraites${ms39Result && !ms39Result.error ? ' (MS 39 utilisé pour l\'API)' : ''}. Vérifiez et modifiez-les si nécessaire.`,
        });
      } else {
        toast({
          title: "Aucune donnée valide",
          description: "Impossible d'extraire les données des fichiers fournis.",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error("Erreur lors de l'extraction IOL:", error);
      
      toast({
        title: "Erreur d'extraction",
        description: `Impossible d'extraire le texte: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiDataChange = (section: string, field: string, value: string) => {
    if (!apiRequestData) return;
    
    // Convert commas to dots for numeric fields (excluding manufacturer and IOL selection fields)
    const processedValue = value.replace(/,/g, '.');
    
    setApiRequestData((prevData: any) => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [field]: processedValue
      }
    }));
  };

  // Helper function to get priority general information (MS-39 over biometry)
  const getPriorityGeneralInfo = (field: 'initials' | 'patientId' | 'age' | 'patientName' | 'dateOfBirth'): string => {
    // Prioritize MS-39 over biometry
    let value = '';
    
    // First try MS-39 data
    if (ms39Data) {
      switch (field) {
        case 'initials':
          value = ms39Data.patientInitials || '';
          break;
        case 'patientId':
          value = ms39Data.patientId || '';
          break;
        case 'age':
          value = ms39Data.age?.toString() || '';
          break;
        case 'patientName':
          value = ms39Data.patientName || '';
          break;
        case 'dateOfBirth':
          value = ms39Data.dateOfBirth || '';
          break;
      }
    }
    
    // If no MS-39 value, try biometry data
    if (!value && biometryData) {
      switch (field) {
        case 'initials':
          value = biometryData.patientInitials || '';
          break;
        case 'patientId':
          value = biometryData.patientId || '';
          break;
        case 'age':
          value = biometryData.age?.toString() || '';
          break;
        case 'patientName':
          value = biometryData.patientName || '';
          break;
        case 'dateOfBirth':
          value = biometryData.dateOfBirth || '';
          break;
      }
    }
    
    return value;
  };

  // Helper function to get extracted values from both files
  const getExtractedValues = (field: string, eye: 'right' | 'left') => {
    const eyeKey = eye === 'right' ? 'rightEye' : 'leftEye';
    const values = [];
    
    // Map API field names to extracted field names
    const fieldMapping: { [key: string]: string } = {
      'CD (WTW)': 'WTW',
      'Target Refraction': 'targetRefraction'
    };
    
    const extractedField = fieldMapping[field] || field;
    
    if (biometryData && biometryData[eyeKey]) {
      const eyeData = biometryData[eyeKey] as any;
      const value = eyeData[extractedField];
      if (value) {
        values.push({ source: 'Biométrie', value });
      }
    }
    
    if (ms39Data && ms39Data[eyeKey]) {
      const eyeData = ms39Data[eyeKey] as any;
      const value = eyeData[extractedField];
      if (value) {
        values.push({ source: 'MS-39', value });
      }
    }
    
    return values;
  };

  // Helper function to get the priority value (MS-39 over biometry)
  const getPriorityValue = (field: string, eye: 'right' | 'left'): string => {
    const eyeKey = eye === 'right' ? 'rightEye' : 'leftEye';
    
    // Map API field names to extracted field names
    const fieldMapping: { [key: string]: string } = {
      'CD (WTW)': 'WTW',
      'Target Refraction': 'targetRefraction'
    };
    
    const extractedField = fieldMapping[field] || field;
    
    // Prioritize MS-39 over biometry
    let value = '';
    
    // First try MS-39 data
    if (ms39Data && ms39Data[eyeKey]) {
      const eyeData = ms39Data[eyeKey] as any;
      value = eyeData[extractedField] || '';
    }
    
    // If no MS-39 value, try biometry data
    if (!value && biometryData && biometryData[eyeKey]) {
      const eyeData = biometryData[eyeKey] as any;
      value = eyeData[extractedField] || '';
    }
    
    console.log(`getPriorityValue: field=${field}, eye=${eye}, extractedField=${extractedField}, value=${value}`);
    return value;
  };

  const submitToIOLAPI = async () => {
    if (!apiRequestData) return;

    setIsCalculating(true);
    
    try {
      // Update the request data with selected manufacturers, IOLs, gender and switches
      const updatedApiData = {
        ...apiRequestData,
        gender: gender,
        right_eye: {
          ...apiRequestData.right_eye,
          switches: {
            "Toric": rightEyeToric,
            "Keratoconus": rightEyeKeratoconus,
            "Argos (SoS) AL": rightEyeArgos,
            "Post LASIK/PRK": rightEyePostLasik
          },
          "Manufacturer": rightEyeManufacturer || apiRequestData.right_eye["Manufacturer"] || "HOYA",
          "Select IOL": rightEyeIOL || apiRequestData.right_eye["Select IOL"] || "XY1-SP",
          ...(rightEyeToric && rightEyeK1Axis && { "K1 axis": rightEyeK1Axis }),
          ...(rightEyeToric && rightEyeSIA && { "SIA": rightEyeSIA }),
          ...(rightEyeToric && rightEyeIncision?.trim() && { "Incision": rightEyeIncision })
        },
        left_eye: {
          ...apiRequestData.left_eye,
          switches: {
            "Toric": leftEyeToric,
            "Keratoconus": leftEyeKeratoconus,
            "Argos (SoS) AL": leftEyeArgos,
            "Post LASIK/PRK": leftEyePostLasik
          },
          "Manufacturer": leftEyeManufacturer || apiRequestData.left_eye["Manufacturer"] || "HOYA",
          "Select IOL": leftEyeIOL || apiRequestData.left_eye["Select IOL"] || "XY1-SP",
          ...(leftEyeToric && leftEyeK1Axis && { "K1 axis": leftEyeK1Axis }),
          ...(leftEyeToric && leftEyeSIA && { "SIA": leftEyeSIA }),
          ...(leftEyeToric && leftEyeIncision?.trim() && { "Incision": leftEyeIncision })
        }
      };

      console.log("Envoi des données à l'API IOL Calculator:", updatedApiData);

      const response = await fetch('https://ecziljpkvshvapjsxaty.supabase.co/functions/v1/calculate-iol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemlsanBrdnNodmFwanN4YXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MTg0ODIsImV4cCI6MjA2MjE5NDQ4Mn0.oRJVDFdTSmUS15nM7BKwsjed0F_S5HeRfviPIdQJkUk`
        },
        body: JSON.stringify(updatedApiData)
      });

      console.log("Calculate-IOL response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge function error: ${response.status} - ${errorText}`);
      }

      // Check if response is an image
      const contentType = response.headers.get('content-type');
      if (contentType?.startsWith('image/')) {
        // Extract share link from headers
        const shareLinkHeader = response.headers.get('X-Share-Link');
        if (shareLinkHeader) {
          setShareLink(shareLinkHeader);
          console.log("Share link received:", shareLinkHeader);
        }
        
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setCalculatedImage(imageUrl);
        console.log("Image received and set");
        
        toast({
          title: "Calcul IOL réussi",
          description: "L'image de calcul IOL a été générée avec succès.",
        });
      } else {
        const result = await response.json();
        console.log("JSON result received:", result);
        
        toast({
          title: "Calcul IOL réussi", 
          description: "Les calculs IOL ont été effectués avec succès.",
        });
      }
      
    } catch (error: any) {
      console.error("Erreur lors du calcul IOL:", error);
      
      toast({
        title: "Erreur de calcul",
        description: `Impossible de calculer l'IOL: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const exportForSelenium = () => {
    const dataToExport = ms39Data && !ms39Data.error ? ms39Data : 
                        biometryData && !biometryData.error ? biometryData : null;
    if (!dataToExport) return;

    const exportData = {
      surgeon: "Tabibian",
      gender: "Female",
      patientInitials: "ME",
      patientId: Date.now().toString(),
      age: "45",
      iolData: dataToExport
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "exported_iol_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Les données IOL ont été exportées pour Selenium.",
    });
  };

  const automateOnESCRS = async () => {
    const dataToUse = ms39Data && !ms39Data.error ? ms39Data : 
                     biometryData && !biometryData.error ? biometryData : null;
    if (!dataToUse) return;
    
    setIsAutomating(true);
    try {
      const response = await fetch('https://ecziljpkvshvapjsxaty.supabase.co/functions/v1/iol-selenium-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iolData: dataToUse }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAutomationResult(result);
        toast({
          title: "Automatisation réussie",
          description: "Le calcul IOL a été effectué sur ESCRS",
        });
      } else {
        throw new Error(result.message || 'Erreur lors de l\'automatisation');
      }
    } catch (error) {
      console.error('Automation error:', error);
      toast({
        title: "Erreur d'automatisation",
        description: "Impossible de lancer l'automatisation sur ESCRS",
        variant: "destructive",
      });
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <>
      {/* Disclaimer Modal */}
      <Dialog open={!hasAcceptedDisclaimer} onOpenChange={() => {}}>
        <DialogContent hideCloseButton className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-2xl">Information importante</DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Conditions d'utilisation et avertissements
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-sm leading-relaxed text-muted-foreground space-y-4">
              <p>
                Ce site a pour <strong className="text-foreground">seule fonction</strong> d'extraire automatiquement les données des fichiers de biométrie (EyeSuite) et MS-39, puis de pré-remplir le formulaire sur le site officiel{' '}
                <a
                  href="https://iolcalculator.escrs.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-700 font-medium"
                >
                  iolcalculator.escrs.org
                </a>.
              </p>

              <p>
                Il est <strong className="text-foreground">impératif</strong> que l'utilisateur vérifie attentivement que toutes les données extraites et importées sont correctes avant de soumettre le formulaire. L'exactitude des résultats calculés dépend entièrement de la validité des données saisies.
              </p>

              <p>
                Cet outil d'assistance <strong className="text-foreground">ne remplace en aucun cas</strong> le jugement clinique professionnel. L'utilisateur assume l'<strong className="text-foreground">entière responsabilité</strong> de la vérification des données et de leur utilisation. <strong className="text-foreground">Aucune responsabilité ne peut être engagée</strong> concernant les résultats obtenus via cet outil.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setHasAcceptedDisclaimer(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 text-base"
            >
              J'ai lu et j'accepte ces conditions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-8">
          <header className="mb-10 pt-8">
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                IOL Calculator
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full"></div>
            </div>
          </header>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-8">
            <CardTitle className="text-xl font-semibold tracking-tight flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <span>Extraction de texte depuis PDF</span>
              </div>
              <Button
                onClick={resetAllData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <RefreshCw className="h-4 w-4" />
                Nouvel IOL
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Grid pour les deux fichiers côte à côte */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Zone de dépôt pour fichier Biométrie */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">Fichier Biométrie</h3>
                </div>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
                  onDrop={(e) => handleDrop(e, 'biometry')}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onClick={() => handleButtonClick('biometry')}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-base">Glissez-déposez votre fichier</p>
                      <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
                      <p className="text-xs text-muted-foreground">(Format PDF accepté)</p>
                    </div>
                    <Button variant="outline" type="button" size="sm" className="mt-2">
                      Choisir un fichier
                    </Button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileSelect(e, 'biometry')}
                    className="hidden"
                    id="biometry-upload"
                  />
                </div>

                {biometryFile && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{biometryFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(biometryFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Zone de dépôt pour fichier MS 39 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">Fichier MS 39</h3>
                </div>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                  onDrop={(e) => handleDrop(e, 'ms39')}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onClick={() => handleButtonClick('ms39')}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                      <Upload className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-base">Glissez-déposez votre fichier</p>
                      <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
                      <p className="text-xs text-muted-foreground">(Format PDF accepté)</p>
                    </div>
                    <Button variant="outline" type="button" size="sm" className="mt-2">
                      Choisir un fichier
                    </Button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileSelect(e, 'ms39')}
                    className="hidden"
                    id="ms39-upload"
                  />
                </div>

                {ms39File && (
                  <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ms39File.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(ms39File.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Bouton d'extraction */}
          {(biometryFile || ms39File) && (
            <div className="flex justify-center pt-4">
              <Button onClick={extractIOLData} disabled={isProcessing} size="lg">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraction en cours...
                  </>
                ) : (
                  "Extraire les données des fichiers"
                )}
              </Button>
            </div>
          )}

          {/* Affichage des données extraites pour chaque fichier */}
          {(biometryData || ms39Data) && (
            <div className="space-y-6">


              {/* Formulaire API IOL Calculator */}
              {isDataExtracted && apiRequestData && (
                <Card className={`relative transition-all duration-300 shadow-md hover:shadow-lg transition-shadow bg-white ${isCalculating ? 'opacity-80' : ''}`}>
                  <CardContent className="space-y-6">
                    {/* Animation de loading superposée */}
                    {isCalculating && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
                        <div className="flex items-center gap-3 bg-background border rounded-lg p-4 shadow-lg animate-scale-in">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="font-medium">Calcul IOL en cours...</span>
                        </div>
                      </div>
                    )}
                    

                    {/* Informations du header */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground mt-4">Informations générales</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <label className="text-sm font-medium">Chirurgien</label>
                          <input
                            type="text"
                            value={apiRequestData.top_fields?.surgeon || ''}
                            onChange={(e) => handleApiDataChange('top_fields', 'surgeon', e.target.value)}
                            className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Initiales patient</label>
                          <input
                            type="text"
                            value={apiRequestData.top_fields?.patient_initials ?? ''}
                            onChange={(e) => handleApiDataChange('top_fields', 'patient_initials', e.target.value)}
                            className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                            placeholder={getPriorityGeneralInfo('initials') ? `Extrait: ${getPriorityGeneralInfo('initials')}` : 'Ex: DT'}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">ID Patient</label>
                          <input
                            type="text"
                            value={apiRequestData.top_fields?.id ?? ''}
                            onChange={(e) => handleApiDataChange('top_fields', 'id', e.target.value)}
                            className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Âge</label>
                          <input
                            type="text"
                            value={apiRequestData.top_fields?.age ?? ''}
                            onChange={(e) => handleApiDataChange('top_fields', 'age', e.target.value)}
                            className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Genre</label>
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger className="w-full mt-1 h-auto py-3 px-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white">
                              <SelectValue placeholder="Sélectionner le genre" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Données des yeux */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Œil droit */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Œil Droit (OD)</h4>
                        
                        {/* Switches section for Right Eye */}
                        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                          <h5 className="text-sm font-semibold text-foreground mb-3">Options</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="right-toric">
                                Toric
                              </label>
                              <Switch
                                id="right-toric"
                                checked={rightEyeToric}
                                onCheckedChange={setRightEyeToric}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="right-keratoconus">
                                Keratoconus
                              </label>
                              <Switch
                                id="right-keratoconus"
                                checked={rightEyeKeratoconus}
                                onCheckedChange={setRightEyeKeratoconus}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="right-argos">
                                Argos (SoS) AL
                              </label>
                              <Switch
                                id="right-argos"
                                checked={rightEyeArgos}
                                onCheckedChange={setRightEyeArgos}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="right-lasik">
                                Post LASIK/PRK
                              </label>
                              <Switch
                                id="right-lasik"
                                checked={rightEyePostLasik}
                                onCheckedChange={setRightEyePostLasik}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(apiRequestData.right_eye)
                            .filter(([key]) => key !== 'Manufacturer' && key !== 'Select IOL' && key !== 'switches' && key !== 'K1 axis' && key !== 'SIA' && key !== 'Incision')
                            .map(([key, value]) => {
                              const isK1 = key === 'K1';
                              return (
                                <>
                                  <div key={key}>
                                    <label className="text-sm font-medium">
                                      {key}
                                      {getExtractedValues(key, 'right').map((item, index) => (
                                        <span key={index} className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                          {item.source}: {item.value}
                                        </span>
                                      ))}
                                    </label>
                                    <input
                                      type="text"
                                      value={(value as string) ?? ''}
                                      onChange={(e) => handleApiDataChange('right_eye', key, e.target.value)}
                                      className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                      placeholder={`Valeur pour ${key}`}
                                    />
                                  </div>
                                  
                                  {/* Afficher les champs Toric après K1 */}
                                  {isK1 && rightEyeToric && (
                                    <>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">K1 axis</label>
                                        <input
                                          type="text"
                                          value={rightEyeK1Axis}
                                          onChange={(e) => setRightEyeK1Axis(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur K1 axis"
                                        />
                                      </div>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">SIA</label>
                                        <input
                                          type="text"
                                          value={rightEyeSIA}
                                          onChange={(e) => setRightEyeSIA(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur SIA"
                                        />
                                      </div>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">Incision</label>
                                        <input
                                          type="text"
                                          value={rightEyeIncision}
                                          onChange={(e) => setRightEyeIncision(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur Incision"
                                        />
                                      </div>
                                    </>
                                  )}
                                </>
                              );
                            })}
                          
                          {/* IOL Selection for Right Eye */}
                          <div className="space-y-3 pt-4 border-t border-border">
                            <h5 className="text-sm font-medium text-foreground">Sélection IOL - Œil Droit</h5>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-sm font-medium">Manufacturier</label>
                                <Select
                                  value={rightEyeManufacturer}
                                  onValueChange={handleRightEyeManufacturerChange}
                                  disabled={iolDataLoading}
                                >
                                  <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder="Sélectionner un manufacturier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(rightEyeToric ? getToricManufacturers() : manufacturers).map((manufacturer) => (
                                      <SelectItem key={manufacturer.manufacturer} value={manufacturer.manufacturer}>
                                        {manufacturer.manufacturer}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">IOL</label>
                                <Select
                                  value={rightEyeIOL}
                                  onValueChange={handleRightEyeIOLChange}
                                  disabled={!rightEyeManufacturer || iolDataLoading}
                                >
                                  <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder={rightEyeManufacturer ? "Sélectionner un IOL" : "Sélectionner d'abord un manufacturier"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rightEyeManufacturer && getIOLsByManufacturer(rightEyeManufacturer, rightEyeToric ? true : undefined).map((iol) => (
                                      <SelectItem key={iol.id} value={iol.iol}>
                                        {iol.iol}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Œil gauche */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Œil Gauche (OS)</h4>
                        
                        {/* Switches section for Left Eye */}
                        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                          <h5 className="text-sm font-semibold text-foreground mb-3">Options</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="left-toric">
                                Toric
                              </label>
                              <Switch
                                id="left-toric"
                                checked={leftEyeToric}
                                onCheckedChange={setLeftEyeToric}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="left-keratoconus">
                                Keratoconus
                              </label>
                              <Switch
                                id="left-keratoconus"
                                checked={leftEyeKeratoconus}
                                onCheckedChange={setLeftEyeKeratoconus}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="left-argos">
                                Argos (SoS) AL
                              </label>
                              <Switch
                                id="left-argos"
                                checked={leftEyeArgos}
                                onCheckedChange={setLeftEyeArgos}
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                              <label className="text-sm font-medium cursor-pointer" htmlFor="left-lasik">
                                Post LASIK/PRK
                              </label>
                              <Switch
                                id="left-lasik"
                                checked={leftEyePostLasik}
                                onCheckedChange={setLeftEyePostLasik}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(apiRequestData.left_eye)
                            .filter(([key]) => key !== 'Manufacturer' && key !== 'Select IOL' && key !== 'switches' && key !== 'K1 axis' && key !== 'SIA' && key !== 'Incision')
                            .map(([key, value]) => {
                              const isK1 = key === 'K1';
                              return (
                                <>
                                  <div key={key}>
                                    <label className="text-sm font-medium">
                                      {key}
                                      {getExtractedValues(key, 'left').map((item, index) => (
                                        <span key={index} className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                          {item.source}: {item.value}
                                        </span>
                                      ))}
                                    </label>
                                    <input
                                      type="text"
                                      value={(value as string) ?? ''}
                                      onChange={(e) => handleApiDataChange('left_eye', key, e.target.value)}
                                      className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                      placeholder={`Valeur pour ${key}`}
                                    />
                                  </div>
                                  
                                  {/* Afficher les champs Toric après K1 */}
                                  {isK1 && leftEyeToric && (
                                    <>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">K1 axis</label>
                                        <input
                                          type="text"
                                          value={leftEyeK1Axis}
                                          onChange={(e) => setLeftEyeK1Axis(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur K1 axis"
                                        />
                                      </div>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">SIA</label>
                                        <input
                                          type="text"
                                          value={leftEyeSIA}
                                          onChange={(e) => setLeftEyeSIA(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur SIA"
                                        />
                                      </div>
                                      <div className="pl-4 border-l-2 border-blue-300">
                                        <label className="text-sm font-medium">Incision</label>
                                        <input
                                          type="text"
                                          value={leftEyeIncision}
                                          onChange={(e) => setLeftEyeIncision(e.target.value.replace(/,/g, '.'))}
                                          className="w-full mt-1 p-3 border-2 border-input rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:border-primary/50 bg-white"
                                          placeholder="Valeur Incision"
                                        />
                                      </div>
                                    </>
                                  )}
                                </>
                              );
                            })}
                          
                          {/* IOL Selection for Left Eye */}
                          <div className="space-y-3 pt-4 border-t border-border">
                            <h5 className="text-sm font-medium text-foreground">Sélection IOL - Œil Gauche</h5>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-sm font-medium">Manufacturier</label>
                                <Select
                                  value={leftEyeManufacturer}
                                  onValueChange={handleLeftEyeManufacturerChange}
                                  disabled={iolDataLoading}
                                >
                                  <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder="Sélectionner un manufacturier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(leftEyeToric ? getToricManufacturers() : manufacturers).map((manufacturer) => (
                                      <SelectItem key={manufacturer.manufacturer} value={manufacturer.manufacturer}>
                                        {manufacturer.manufacturer}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">IOL</label>
                                <Select
                                  value={leftEyeIOL}
                                  onValueChange={handleLeftEyeIOLChange}
                                  disabled={!leftEyeManufacturer || iolDataLoading}
                                >
                                  <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder={leftEyeManufacturer ? "Sélectionner un IOL" : "Sélectionner d'abord un manufacturier"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {leftEyeManufacturer && getIOLsByManufacturer(leftEyeManufacturer, leftEyeToric ? true : undefined).map((iol) => (
                                      <SelectItem key={iol.id} value={iol.iol}>
                                        {iol.iol}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bouton de soumission */}
                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={submitToIOLAPI}
                        disabled={isCalculating || !isIOLFormComplete}
                        size="lg"
                        className={`${isIOLFormComplete 
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Calcul en cours...
                          </>
                        ) : (
                          "Soumettre à IOL Calculator"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {calculatedImage && (
                <>
                  <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    Résultat du calcul IOL
                  </h3>
                  <div className="border border-border rounded-lg p-4 bg-card space-y-4">
                    {shareLink && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Lien de partage ESCRS:</p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={shareLink} 
                            readOnly 
                            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(shareLink);
                              toast({
                                title: "Copié!",
                                description: "Le lien a été copié dans le presse-papiers.",
                              });
                            }}
                          >
                            Copier
                          </Button>
                        </div>
                      </div>
                    )}
                    <img 
                      src={calculatedImage} 
                      alt="Résultat du calcul IOL"
                      className="max-w-full h-auto rounded border"
                    />
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Créer un nom de fichier avec les initiales et date de naissance
                          const dataForFileName = ms39Data && !ms39Data.error ? ms39Data : 
                                                 biometryData && !biometryData.error ? biometryData : null;
                          const initials = dataForFileName?.patientInitials || 'Patient';
                          const dateOfBirth = dataForFileName?.dateOfBirth || '';
                          // Nettoyer la date pour enlever les caractères spéciaux
                          const cleanDate = dateOfBirth.replace(/[^0-9]/g, '');
                          const fileName = `${initials}${cleanDate}.png`;
                          
                          const link = document.createElement('a');
                          link.href = calculatedImage;
                          link.download = fileName;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger l'image
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {automationResult && (
            <Card className="mt-6 shadow-md hover:shadow-lg transition-shadow bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🤖 Résultat de l'automatisation ESCRS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Patient:</p>
                    <p className="text-muted-foreground">{automationResult.patientData.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">ID Patient:</p>
                    <p className="text-muted-foreground">{automationResult.patientData.id}</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <img 
                    src={automationResult.screenshot} 
                    alt="Résultat ESCRS Calculator" 
                    className="w-full h-auto"
                  />
                </div>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = automationResult.screenshot;
                    link.download = `escrs_result_${automationResult.patientData.id}.png`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Télécharger le screenshot
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

        {/* Footer */}
        <footer className="mt-16 pb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    Besoin d'automatisation ou d'une solution sur mesure ?
                  </p>
                  <a
                    href="mailto:michael.enry@olia-solution.com"
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all"
                  >
                    michael.enry@olia-solution.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
        </div>
      </div>
    </>
  );
}