// Load PDF.js dynamically from CDN like in the working HTML example
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// Function to dynamically load PDF.js from CDN
async function loadPdfJs(): Promise<any> {
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      console.log('✅ PDF.js loaded from CDN');
      // Configure worker to use CDN version to match the working HTML example
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => {
      console.error('❌ Failed to load PDF.js from CDN');
      reject(new Error('Failed to load PDF.js'));
    };
    document.head.appendChild(script);
  });
}

export type PDFType = 'eyesuite' | 'ms39' | 'unknown';

export interface IOLData {
  // Informations générales
  pdfType?: PDFType;
  surgeryType?: string;
  measurementDate?: string;
  patientName?: string;
  patientInitials?: string;
  patientId?: string;
  dateOfBirth?: string;
  age?: number;
  
  // Données pour œil droit (OD)
  rightEye?: {
    AL?: string; // AL [mm]
    CCT?: string; // CCT [μm]
    AD?: string; // AD [mm]
    ACD?: string; // ACD [mm]
    LT?: string; // LT [mm]
    K1?: string; // K1 [D/mm/°]
    K2?: string; // K2 [D/mm/°]
    K1Axis?: string; // K1 Axis [°]
    K?: string; // K [D/mm]
    AST?: string; // Astigmatisme (AST) [D/°]
    WTW?: string; // Distance blanc à blanc (WTW) [mm]
    targetRefraction?: string; // Réfraction cible
  };
  
  // Données pour œil gauche (OS)
  leftEye?: {
    AL?: string; // AL [mm]
    CCT?: string; // CCT [μm]
    AD?: string; // AD [mm]
    ACD?: string; // ACD [mm]
    LT?: string; // LT [mm]
    K1?: string; // K1 [D/mm/°]
    K2?: string; // K2 [D/mm/°]
    K1Axis?: string; // K1 Axis [°]
    K?: string; // K [D/mm]
    AST?: string; // Astigmatisme (AST) [D/°]
    WTW?: string; // Distance blanc à blanc (WTW) [mm]
    targetRefraction?: string; // Réfraction cible
  };
  
  rawText?: string;
  error?: boolean;
  message?: string;
  calculatedResults?: any; // Results from calculate-iol edge function
  extractedDataForAPI?: any; // Données formatées pour l'API
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    console.log('🔄 Starting PDF text extraction with HTML approach');
    console.log('📄 File:', file.name, 'Size:', file.size);

    // Load PDF.js from CDN exactly like in the working HTML example
    const pdfjsLib = await loadPdfJs();
    
    // Convert file to array buffer exactly like in the HTML example
    const arrayBuffer = await file.arrayBuffer();

    // Use exactly the same approach as the working HTML example
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('✅ PDF loaded successfully, pages:', pdf.numPages);

    let fullText = '';

    // Extract text from all pages exactly like in the HTML example
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`📖 Processing page ${pageNum}/${pdf.numPages}`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      
      console.log(`✅ Page ${pageNum} text extracted (${pageText.length} chars)`);
    }

    console.log('🎉 PDF text extraction completed successfully!');
    console.log('📊 Total extracted text length:', fullText.length);
    
    return fullText.trim();
    
  } catch (error) {
    console.error('❌ Error extracting text from PDF:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Full error:', error);
    throw error;
  }
};

// Fonction pour détecter le type de PDF
export const detectPDFType = (rawText: string): PDFType => {
  console.log('🔍 Detecting PDF type from extracted text');
  
  // Rechercher les marqueurs spécifiques à EyeSuite
  if (rawText.includes('EyeSuite') || rawText.includes('IOL') || rawText.includes('SID:') || rawText.includes('LS900 cône T')) {
    console.log('✅ Detected PDF type: EyeSuite');
    return 'eyesuite';
  }
  
  // Rechercher les marqueurs spécifiques à MS 39 (commence par nom patient, puis ID, puis date de naissance)
  if (rawText.includes('CCT + AqD =') || rawText.includes('W-W*') || rawText.includes('simk')) {
    console.log('✅ Detected PDF type: MS 39');
    return 'ms39';
  }
  
  console.log('⚠️ Unknown PDF type detected');
  return 'unknown';
};

// Parser spécifique pour EyeSuite
export const parseEyeSuiteIOLData = (rawText: string): IOLData => {
  console.log('🔍 Parsing EyeSuite IOL data from extracted text');
  
  const data: IOLData = {
    rawText,
    pdfType: 'eyesuite',
    error: false,
    rightEye: {},
    leftEye: {}
  };

  try {
    // Fonction helper pour extraire une valeur par regex avec gestion des occurrences multiples
    // Retourne seulement les matches qui ont une valeur numérique valide
    const extractValue = (pattern: RegExp, occurrence: number = 1): string | undefined => {
      const matches = [...rawText.matchAll(new RegExp(pattern.source, 'g'))];
      // Filtrer pour ne garder que les matches avec une valeur valide (non vide, non null)
      const validMatches = matches.filter(match => match[1] && match[1].trim() !== '');

      if (validMatches.length >= occurrence && validMatches[occurrence - 1]) {
        return validMatches[occurrence - 1][1];
      }
      return undefined;
    };

    // Fonction helper pour extraire les valeurs d'un champ avec gestion des occurrences vides
    // Logique simple: 1ère occurrence = œil droit, 2ème occurrence = œil gauche
    const extractFieldValues = (fieldLabel: string, patternWithValue: RegExp, patternWithoutValue: RegExp): { right?: string, left?: string } => {
      // Trouver toutes les occurrences avec leur position dans le texte
      const allMatchesWithPos: Array<{ position: number, value?: string }> = [];

      // Chercher toutes les occurrences (avec ou sans valeur)
      let match;
      const patternWithoutValueGlobal = new RegExp(patternWithoutValue.source, 'g');
      while ((match = patternWithoutValueGlobal.exec(rawText)) !== null) {
        allMatchesWithPos.push({
          position: match.index,
          value: undefined
        });
      }

      // Chercher les occurrences avec valeur et mettre à jour les positions correspondantes
      const patternWithValueGlobal = new RegExp(patternWithValue.source, 'g');
      while ((match = patternWithValueGlobal.exec(rawText)) !== null) {
        // Trouver l'occurrence correspondante dans allMatchesWithPos
        const correspondingMatch = allMatchesWithPos.find(m => m.position === match.index);
        if (correspondingMatch) {
          correspondingMatch.value = match[1];
        }
      }

      // Trier par position (devrait déjà être trié, mais par sécurité)
      allMatchesWithPos.sort((a, b) => a.position - b.position);

      console.log(`📊 ${fieldLabel} - Found ${allMatchesWithPos.length} occurrences:`,
        allMatchesWithPos.map((m, i) => `${i + 1}: ${m.value || 'empty'}`).join(', '));

      // Assigner selon l'ordre d'apparition: 1ère = droit, 2ème = gauche
      const result = { right: undefined as string | undefined, left: undefined as string | undefined };

      if (allMatchesWithPos.length >= 1) {
        result.right = allMatchesWithPos[0].value;
      }
      if (allMatchesWithPos.length >= 2) {
        result.left = allMatchesWithPos[1].value;
      }

      return result;
    };

    // Fonction helper pour extraire des valeurs multiples (K1, K2, K, AST)
    const extractMultipleValues = (pattern: RegExp, occurrence: number = 1): string | undefined => {
      const matches = [...rawText.matchAll(new RegExp(pattern.source, 'g'))];
      if (matches.length >= occurrence && matches[occurrence - 1]) {
        const match = matches[occurrence - 1];
        if (match.length === 4) { // K1, K2 avec angle: 45.17 /7.47 @ 178
          return `${match[1]} / ${match[2]} @ ${match[3]}`;
        } else if (match.length === 3 && pattern.source.includes('AST')) { // AST: 0.89 @ 88
          return `${match[1]} @ ${match[2]}`;
        } else if (match.length === 3) { // K sans angle: 45.62 /7.40
          return `${match[1]} / ${match[2]}`;
        }
      }
      return undefined;
    };

    // Fonction helper pour extraire la réfraction cible de manière intelligente
    // Règle 1: Si 2+ occurrences → 1ère = droit, 2ème = gauche
    // Règle 2: Si 1 seule occurrence → assigner à l'œil avec le plus de champs remplis
    const extractTargetRefractionSmart = (data: IOLData): { right?: string, left?: string } => {
      const pattern = /Réfraction\s+cible\s*:\s*([-\+]?[\d\.]+(?:\s*[-\+]?\s*[\d\.]+)*)/gi;
      const matches = [...rawText.matchAll(pattern)];

      console.log(`📊 Réfraction cible - Found ${matches.length} occurrence(s)`);

      if (matches.length === 0) {
        return { right: undefined, left: undefined };
      }

      // Cas 1: 2+ occurrences → 1ère = droit, 2ème = gauche
      if (matches.length >= 2) {
        const rightValue = matches[0][1].trim();
        const leftValue = matches[1][1].trim();
        console.log(`📊 Réfraction cible - 2+ occurrences → Right: ${rightValue}, Left: ${leftValue}`);
        return { right: rightValue, left: leftValue };
      }

      // Cas 2: 1 seule occurrence → déterminer l'œil avec le plus de données
      const singleValue = matches[0][1].trim();

      // Compter les champs NON-VIDES pour chaque œil
      const rightFieldsCount = [
        data.rightEye?.AL,
        data.rightEye?.CCT,
        data.rightEye?.K1,
        data.rightEye?.K2,
        data.rightEye?.ACD,
        data.rightEye?.LT,
        data.rightEye?.WTW
      ].filter(value => value !== undefined && value !== null && value.trim() !== '').length;

      const leftFieldsCount = [
        data.leftEye?.AL,
        data.leftEye?.CCT,
        data.leftEye?.K1,
        data.leftEye?.K2,
        data.leftEye?.ACD,
        data.leftEye?.LT,
        data.leftEye?.WTW
      ].filter(value => value !== undefined && value !== null && value.trim() !== '').length;

      console.log(`📊 Réfraction cible - Right eye filled fields: ${rightFieldsCount}, Left eye filled fields: ${leftFieldsCount}`);

      // Assigner à l'œil avec le plus de champs remplis (en cas d'égalité → droit par défaut)
      if (rightFieldsCount >= leftFieldsCount) {
        console.log(`📊 Réfraction cible - Assigned to RIGHT eye: ${singleValue}`);
        return { right: singleValue, left: undefined };
      } else {
        console.log(`📊 Réfraction cible - Assigned to LEFT eye: ${singleValue}`);
        return { right: undefined, left: singleValue };
      }
    };

    // Fonction pour extraire le nom du patient depuis la ligne EyeSuite
    const extractPatientName = (): { name: string; initials: string; dateOfBirth: string; sid: string } | undefined => {
      // Pattern pour EyeSuite™ IOL, V4.10.1  SID: 3503  Tabibian, David, 26.02.1983
      const eyeSuitePattern = /EyeSuite™?\s+IOL.*?SID:\s*(\d+)\s+([A-Za-zÀ-ÿ]+),\s*([A-Za-zÀ-ÿ]+),\s*(\d{1,2}\.\d{1,2}\.\d{4})/;
      const match = rawText.match(eyeSuitePattern);
      
      if (match) {
        const sid = match[1].trim();
        const lastName = match[2].trim();
        const firstName = match[3].trim();
        const dateOfBirth = match[4].trim();
        
        // Inverser pour avoir "Prénom Nom"
        const fullName = `${firstName} ${lastName}`;
        
        // Créer les initiales : première lettre du prénom + première lettre du nom
        const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
        
        return {
          name: fullName,
          initials: initials,
          dateOfBirth: dateOfBirth,
          sid: sid
        };
      }
      
      return undefined;
    };

    // Fonction pour calculer l'âge depuis une date de naissance
    const calculateAge = (dateOfBirth: string): number | undefined => {
      try {
        // Format DD.MM.YYYY
        const [day, month, year] = dateOfBirth.split('.').map(num => parseInt(num, 10));
        
        if (!day || !month || !year) return undefined;
        
        const birthDate = new Date(year, month - 1, day); // month est 0-indexé
        const today = new Date();
        
        if (isNaN(birthDate.getTime())) return undefined;
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - (month - 1); // Corriger la comparaison des mois
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
          age--;
        }
        
        return age > 0 && age < 150 ? age : undefined;
      } catch {
        return undefined;
      }
    };

    // 1. Extraire les informations personnelles du patient depuis EyeSuite
    const patientInfo = extractPatientName();
    if (patientInfo) {
      data.patientName = patientInfo.name;
      data.patientInitials = patientInfo.initials;
      data.dateOfBirth = patientInfo.dateOfBirth;
      data.patientId = patientInfo.sid;
      data.age = calculateAge(patientInfo.dateOfBirth);
      
      console.log(`Biometry extracted name: ${data.patientName}, initials: ${data.patientInitials}, SID: ${data.patientId}`);
    }

    // 2. Extraire le type de chirurgie
    if (rawText.includes('Phaque')) {
      data.surgeryType = 'Phaque';
    }

    // 3. Extraire la date de mesure (LS900 cône T <date>)
    const dateMatch = rawText.match(/LS900 cône T\s+(\d{1,2}\s+\w+\s+\d{4})/);
    if (dateMatch) {
      data.measurementDate = dateMatch[1];
    }

    // 4. Extraire les données pour les deux yeux
    // Logique simple: 1ère occurrence = œil droit, 2ème occurrence = œil gauche

    // AL [mm]
    const alValues = extractFieldValues('AL', /AL\s+\[mm\]\s+([\d\.]+)/g, /AL\s+\[mm\]/g);
    data.rightEye!.AL = alValues.right;
    data.leftEye!.AL = alValues.left;

    // CCT [μm]
    const cctValues = extractFieldValues('CCT', /CCT\s+\[μm\]\s+([\d\.]+)/g, /CCT\s+\[μm\]/g);
    data.rightEye!.CCT = cctValues.right;
    data.leftEye!.CCT = cctValues.left;

    // AD [mm]
    const adValues = extractFieldValues('AD', /AD\s+\[mm\]\s+([\d\.]+)/g, /AD\s+\[mm\]/g);
    data.rightEye!.AD = adValues.right;
    data.leftEye!.AD = adValues.left;

    // ACD [mm]
    const acdValues = extractFieldValues('ACD', /ACD\s+\[mm\]\s+([\d\.]+)/g, /ACD\s+\[mm\]/g);
    data.rightEye!.ACD = acdValues.right;
    data.leftEye!.ACD = acdValues.left;

    // LT [mm]
    const ltValues = extractFieldValues('LT', /LT\s+\[mm\]\s+([\d\.]+)/g, /LT\s+\[mm\]/g);
    data.rightEye!.LT = ltValues.right;
    data.leftEye!.LT = ltValues.left;

    // K1 [D/mm/°]
    const k1Values = extractFieldValues('K1', /K1\s+\[D\/mm\/°\]\s+([\d\.]+)/g, /K1\s+\[D\/mm\/°\]/g);
    data.rightEye!.K1 = k1Values.right;
    data.leftEye!.K1 = k1Values.left;

    // K2 [D/mm/°]
    const k2Values = extractFieldValues('K2', /K2\s+\[D\/mm\/°\]\s+([\d\.]+)/g, /K2\s+\[D\/mm\/°\]/g);
    data.rightEye!.K2 = k2Values.right;
    data.leftEye!.K2 = k2Values.left;

    // WTW [mm]
    const wtwValues = extractFieldValues('WTW', /WTW\s+\[mm\]\s+([\d\.]+)/g, /WTW\s+\[mm\]/g);
    data.rightEye!.WTW = wtwValues.right;
    data.leftEye!.WTW = wtwValues.left;

    // K [D/mm] et AST [D/°] - gardent l'ancienne logique car format différent
    data.rightEye!.K = extractMultipleValues(/K\s+\[D\/mm\]\s+([\d\.]+)\s*\/\s*([\d\.]+)/g, 1);
    data.leftEye!.K = extractMultipleValues(/K\s+\[D\/mm\]\s+([\d\.]+)\s*\/\s*([\d\.]+)/g, 2);

    data.rightEye!.AST = extractMultipleValues(/\+AST\s+\[D\/°\]\s+([\d\.]+)\s+@\s*(\d+)/g, 1);
    data.leftEye!.AST = extractMultipleValues(/\+AST\s+\[D\/°\]\s+([\d\.]+)\s+@\s*(\d+)/g, 2);

    // Extraction de la réfraction cible de manière intelligente
    // IMPORTANT: Appeler APRÈS l'extraction de tous les autres champs pour avoir les données nécessaires
    const targetRefractionValues = extractTargetRefractionSmart(data);
    data.rightEye!.targetRefraction = targetRefractionValues.right;
    data.leftEye!.targetRefraction = targetRefractionValues.left;

    console.log('✅ IOL data parsing completed');
    console.log('📊 Extracted data:', {
      surgeryType: data.surgeryType,
      measurementDate: data.measurementDate,
      rightEye: data.rightEye,
      leftEye: data.leftEye
    });

  } catch (error) {
    console.error('❌ Error parsing IOL data:', error);
    data.error = true;
    data.message = 'Erreur lors de l\'analyse des données IOL';
  }

  return data;
};

// Parser spécifique pour MS 39
export const parseMS39IOLData = (rawText: string): IOLData => {
  console.log('🔍 Parsing MS 39 IOL data from extracted text');
  
  const data: IOLData = {
    rawText,
    pdfType: 'ms39',
    error: false,
    rightEye: {},
    leftEye: {}
  };

  try {
    // Fonction helper pour extraire une valeur par regex avec gestion des occurrences multiples
    const extractValue = (pattern: RegExp, occurrence: number = 1): string | undefined => {
      const matches = [...rawText.matchAll(new RegExp(pattern.source, 'g'))];
      if (matches.length >= occurrence && matches[occurrence - 1]) {
        return matches[occurrence - 1][1];
      }
      return undefined;
    };

    // Extraire nom du patient et informations générales après "--- Page 1 ---"
    // Chercher le pattern "Nom, Prénom" après "--- Page 1 ---"
    const pageOneMatch = rawText.match(/--- Page 1 ---\s*\n\s*([A-Za-zÀ-ÿ]+)\s*,\s*([A-Za-zÀ-ÿ]+)/);
    
    if (pageOneMatch) {
      const [_, lastName, firstName] = pageOneMatch;
      
      // Nom complet: Prénom Nom
      data.patientName = `${firstName} ${lastName}`.trim();
      
      // Initiales: Première lettre du prénom + première lettre du nom
      data.patientInitials = `${firstName[0]}${lastName[0]}`.toUpperCase();
      
      console.log(`MS-39 extracted name after Page 1: ${data.patientName}, initials: ${data.patientInitials}`);
    } else {
      // Fallback: chercher "Nom, Prénom" au début du texte
      const firstLineMatch = rawText.match(/^([A-Za-zÀ-ÿ]+),\s*([A-Za-zÀ-ÿ]+)/m);
      
      if (firstLineMatch) {
        const [_, lastName, firstName] = firstLineMatch;
        
        // Nom complet: Prénom Nom
        data.patientName = `${firstName} ${lastName}`.trim();
        
        // Initiales: Première lettre du prénom + première lettre du nom
        data.patientInitials = `${firstName[0]}${lastName[0]}`.toUpperCase();
        
        console.log(`MS-39 extracted name from first line: ${data.patientName}, initials: ${data.patientInitials}`);
      }
    }
    
    // Extraire ID du patient : texte entre "Nom, Prénom" et "Birthdate"
    const birthIdx = rawText.search(/Birthdate/i);
    if (birthIdx !== -1) {
      const beforeBirth = rawText.slice(0, birthIdx);
      const nameMatches = [...beforeBirth.matchAll(/([A-Za-zÀ-ÿ]+)\s*,\s*([A-Za-zÀ-ÿ]+)/g)];
      if (nameMatches.length) {
        const last = nameMatches[nameMatches.length - 1] as RegExpMatchArray & { index?: number };
        const startIdx = (last.index ?? beforeBirth.lastIndexOf(last[0])) + last[0].length;
        let between = beforeBirth.slice(startIdx).trim();
        // Prendre la première ligne/segment non vide
        let candidate = between.split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || between;
        // Nettoyage des libellés potentiels
        candidate = candidate
          .replace(/^(ID|Patient\s*ID|Identifiant)\s*[:\-]?\s*/i, '')
          .replace(/[|•·]+/g, ' ')
          .trim();
        // Si la ligne contient encore le nom, le retirer
        const fullNamePattern = new RegExp(`^${last[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*`, 'i');
        candidate = candidate.replace(fullNamePattern, '').trim();
        // Garder le premier token plausible
        const token = (candidate.match(/[A-Z0-9][A-Z0-9\-_/\.]{1,}/i) || [])[0];
        if (token) {
          data.patientId = token;
          console.log(`MS-39 extracted patient ID (between name and Birthdate): ${data.patientId}`);
        }
      }
    }

    // Fallback si non trouvé : chercher un identifiant plausible (alphanumérique ≥ 4)
    if (!data.patientId) {
      const fallbackIdMatch = rawText.match(/\b([A-Z0-9][A-Z0-9\-_/\.]{3,})\b/i);
      if (fallbackIdMatch) {
        data.patientId = fallbackIdMatch[1];
        console.log(`MS-39 extracted patient ID (fallback): ${data.patientId}`);
      }
    }

    // Extraire date de naissance (format DD.MM.YYYY ou DD/MM/YYYY)
    const dateMatch = rawText.match(/(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{4})/);
    if (dateMatch) {
      data.dateOfBirth = dateMatch[1].replace(/\//g, '.');
      console.log(`MS-39 extracted birth date: ${data.dateOfBirth}`);
      
      // Calculer l'âge
      try {
        const [day, month, year] = data.dateOfBirth.split('.').map(num => parseInt(num, 10));
        const birthDateObj = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - (month - 1);
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
          age--;
        }
        if (age > 0 && age < 150) {
          data.age = age;
          console.log(`MS-39 calculated age: ${data.age}`);
        }
      } catch {
        console.log('MS-39 age calculation failed');
      }
    }

    // Fonction helper pour normaliser les nombres (remplacer virgules par points)
    const normalizeNumber = (value: string): string => {
      return value.replace(',', '.');
    };

    // Extraire CCT + AqD = "nombre" - enlever le 0 et les guillemets et mettre dans CCT
    // Premières occurrences pour œil droit, deuxièmes pour œil gauche
    const cctMatches = [...rawText.matchAll(/CCT \+ AqD = "?([0-9\.,]+)"?/g)];
    if (cctMatches.length >= 1) {
      let cctValue = normalizeNumber(cctMatches[0][1]);
      // Enlever les guillemets
      cctValue = cctValue.replace(/"/g, '');
      // Enlever le 0 au début si présent
      if (cctValue.startsWith('0') && cctValue.length > 1) {
        cctValue = cctValue.substring(1);
      }
      // Enlever le point au début si présent
      if (cctValue.startsWith('.')) {
        cctValue = cctValue.substring(1);
      }
      data.rightEye!.CCT = cctValue;
    }
    if (cctMatches.length >= 2) {
      let cctValue = normalizeNumber(cctMatches[1][1]);
      // Enlever les guillemets
      cctValue = cctValue.replace(/"/g, '');
      // Enlever le 0 au début si présent
      if (cctValue.startsWith('0') && cctValue.length > 1) {
        cctValue = cctValue.substring(1);
      }
      // Enlever le point au début si présent
      if (cctValue.startsWith('.')) {
        cctValue = cctValue.substring(1);
      }
      data.leftEye!.CCT = cctValue;
    }

    // Extraire ACD (après + puis un nombre puis = qui finit par "mm")
    const acdMatches = [...rawText.matchAll(/\+\s*([0-9\.,]+)\s*=\s*([0-9\.,]+)\s*mm/g)];
    if (acdMatches.length >= 1) {
      data.rightEye!.ACD = normalizeNumber(acdMatches[0][2]);
    }
    if (acdMatches.length >= 2) {
      data.leftEye!.ACD = normalizeNumber(acdMatches[1][2]);
    }

    // Extraire W-W* = pour CD (WTW)
    const wtwMatches = [...rawText.matchAll(/W-W\*?\s*=\s*([0-9\.,]+)/g)];
    if (wtwMatches.length >= 1) {
      data.rightEye!.WTW = normalizeNumber(wtwMatches[0][1]);
    }
    if (wtwMatches.length >= 2) {
      data.leftEye!.WTW = normalizeNumber(wtwMatches[1][1]);
    }

    // Extraire SimK - premier nombre pour œil droit K1, deuxième nombre pour œil gauche K1
    // Puis trouver les K2 correspondants
    const simkMatches = [...rawText.matchAll(/SimK[^0-9]*([0-9\.,]+)/g)];
    if (simkMatches.length >= 1) {
      data.rightEye!.K1 = normalizeNumber(simkMatches[0][1]);
    }
    if (simkMatches.length >= 2) {
      data.leftEye!.K1 = normalizeNumber(simkMatches[1][1]);
    }
    
    // Pour K2, chercher les deuxièmes valeurs après chaque SimK
    const simkK2Matches = [...rawText.matchAll(/SimK[^0-9]*[0-9\.,]+[^0-9]+([0-9\.,]+)/g)];
    if (simkK2Matches.length >= 1) {
      data.rightEye!.K2 = normalizeNumber(simkK2Matches[0][1]);
    }
    if (simkK2Matches.length >= 2) {
      data.leftEye!.K2 = normalizeNumber(simkK2Matches[1][1]);
    }

    // Extraire K1 Axis (valeur après le slash avec degré)
    // Format MS-39 : "SimK - 42,98 43,51 43,24 -0,53/94°"
    // Ce regex capture directement "/nombre°" sur la ligne SimK
    const k1AxisMatches = [...rawText.matchAll(/SimK[^\n]*?\/\s*(\d{1,3})°/gi)];
    if (k1AxisMatches.length >= 1) {
      data.rightEye!.K1Axis = k1AxisMatches[0][1];
      console.log(`MS-39 extracted right eye K1 Axis: ${data.rightEye!.K1Axis}°`);
    }
    if (k1AxisMatches.length >= 2) {
      data.leftEye!.K1Axis = k1AxisMatches[1][1];
      console.log(`MS-39 extracted left eye K1 Axis: ${data.leftEye!.K1Axis}°`);
    }

    console.log('✅ MS 39 data parsing completed');
    console.log('📊 Extracted data:', {
      patientName: data.patientName,
      patientInitials: data.patientInitials,
      dateOfBirth: data.dateOfBirth,
      age: data.age,
      rightEye: data.rightEye,
      leftEye: data.leftEye
    });

  } catch (error) {
    console.error('❌ Error parsing MS 39 data:', error);
    data.error = true;
    data.message = 'Erreur lors de l\'analyse des données MS 39';
  }

  return data;
};

// Parser générique pour types inconnus
export const parseUnknownIOLData = (rawText: string): IOLData => {
  console.log('🔍 Parsing unknown PDF type - returning raw text only');
  
  return {
    rawText,
    pdfType: 'unknown',
    error: false,
    message: 'Type de PDF non reconnu. Veuillez configurer le mapping pour ce type de document.',
    rightEye: {},
    leftEye: {}
  };
};

// Parser principal qui détermine le type et utilise le bon parser
export const parseIOLData = (rawText: string): IOLData => {
  const pdfType = detectPDFType(rawText);
  
  switch (pdfType) {
    case 'eyesuite':
      return parseEyeSuiteIOLData(rawText);
    case 'ms39':
      return parseMS39IOLData(rawText);
    case 'unknown':
    default:
      return parseUnknownIOLData(rawText);
  }
};

export const extractIOLDataFromPdf = async (file: File): Promise<IOLData> => {
  try {
    const rawText = await extractTextFromPdf(file);

    // 🔍 LOG POUR DEBUG - Afficher le texte brut extrait
    console.log('=' .repeat(80));
    console.log('📄 RAW TEXT EXTRACTED FROM PDF:');
    console.log('=' .repeat(80));
    console.log(rawText);
    console.log('=' .repeat(80));

    if (!rawText || rawText.trim().length === 0) {
      return {
        error: true,
        message: 'Document scanné détecté - Aucun texte n\'a pu être extrait du PDF. Veuillez utiliser un service OCR pour traiter ce document.',
        rawText: ''
      };
    }

    // Check if extracted text is very short (likely a scanned document)
    if (rawText.trim().length < 50) {
      return {
        error: true,
        message: 'Document scanné détecté - Le texte extrait est très court. Ce document semble être une image scannée nécessitant un service OCR.',
        rawText
      };
    }

    return parseIOLData(rawText);
    
  } catch (error) {
    console.error('❌ Error extracting IOL data from PDF:', error);
    return {
      error: true,
      message: `Erreur lors de l'extraction: ${error?.message || 'Erreur inconnue'}`,
      rawText: ''
    };
  }
};