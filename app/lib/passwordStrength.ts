// Unified Password & Security PIN Structure Assessment Engine for Students and Administrators
// Evaluates character entropy, structural criteria, common dictionaries, and role-based policies.

export type PasswordRole = "student" | "admin" | "pin";
export type PasswordStrengthLevel = "empty" | "weak" | "good" | "strong";

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
  required: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 - 100
  level: PasswordStrengthLevel;
  label: "Weak" | "Good" | "Strong" | "";
  color: "rose" | "amber" | "emerald" | "slate";
  progressPercent: number;
  requirements: PasswordRequirement[];
  feedback: string;
  isValid: boolean;
}

const COMMON_FORBIDDEN_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "asdfghjkl",
  "brainlab",
  "brainlab123",
  "administrator",
  "admin123",
  "admin2026",
  "student123",
  "welcome123",
  "nigeria123",
]);

const FORBIDDEN_PINS = new Set([
  "0000",
  "1111",
  "1234",
  "2222",
  "3333",
  "4321",
  "000000",
  "111111",
  "123456",
  "654321",
  "12345678",
  "87654321",
  "00000000",
  "11111111",
  "12341234",
]);

/**
 * Assesses password or PIN structure and returns strength metrics, progress percentage,
 * real-time criteria checklist, and actionable feedback.
 */
export function evaluatePasswordStrength(
  password: string,
  role: PasswordRole = "student"
): PasswordStrengthResult {
  if (!password || password.length === 0) {
    return {
      score: 0,
      level: "empty",
      label: "",
      color: "slate",
      progressPercent: 0,
      requirements: getBaseRequirements("", role),
      feedback: role === "pin"
        ? "Enter a 4 to 12 character Security PIN."
        : role === "admin"
        ? "Admin passwords must be at least 10 characters with mixed-case, numbers, and symbols."
        : "Student passwords must be at least 8 characters.",
      isValid: false,
    };
  }

  const clean = password.trim();

  // Role: PIN evaluation
  if (role === "pin") {
    return evaluatePinStrength(clean);
  }

  const minLength = role === "admin" ? 10 : 8;

  // Criteria checks
  const hasMinLength = clean.length >= minLength;
  const hasUppercase = /[A-Z]/.test(clean);
  const hasLowercase = /[a-z]/.test(clean);
  const hasNumber = /[0-9]/.test(clean);
  const hasSymbol = /[^A-Za-z0-9]/.test(clean);
  const isForbidden = COMMON_FORBIDDEN_PASSWORDS.has(clean.toLowerCase());

  // Requirements checklist
  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      met: hasMinLength,
      required: true,
    },
    {
      id: "letters",
      label: "Uppercase & lowercase letters",
      met: hasUppercase && hasLowercase,
      required: true,
    },
    {
      id: "numbers",
      label: "At least one number (0-9)",
      met: hasNumber,
      required: true,
    },
    {
      id: "symbols",
      label: "Special symbol (e.g. !@#$%^&*)",
      met: hasSymbol,
      required: role === "admin",
    },
  ];

  // Base score calculation
  let rawScore = 0;

  // 1. Length scoring (up to 40 pts)
  if (clean.length >= minLength) {
    rawScore += 25;
    const bonusLength = Math.min(clean.length - minLength, 8);
    rawScore += bonusLength * 2; // up to +16 bonus for extra length
  } else {
    rawScore += Math.floor((clean.length / minLength) * 20);
  }

  // 2. Character diversity (up to 45 pts)
  if (hasLowercase) rawScore += 10;
  if (hasUppercase) rawScore += 10;
  if (hasNumber) rawScore += 10;
  if (hasSymbol) rawScore += 15;

  // 3. Variety bonus (up to 15 pts)
  const uniqueChars = new Set(clean).size;
  if (uniqueChars >= 8) rawScore += 10;
  if (uniqueChars >= 12) rawScore += 5;

  // Penalties
  if (isForbidden) {
    rawScore = Math.min(rawScore, 15);
  }
  if (/(.)\1{2,}/.test(clean)) {
    rawScore -= 10; // repeated consecutive chars like "aaa"
  }
  if (/^[0-9]+$/.test(clean) || /^[a-zA-Z]+$/.test(clean)) {
    rawScore -= 15; // all digits or all letters
  }

  const score = Math.max(0, Math.min(100, rawScore));

  // Determine Level & Validity
  let level: PasswordStrengthLevel = "weak";
  let label: "Weak" | "Good" | "Strong" = "Weak";
  let color: "rose" | "amber" | "emerald" = "rose";
  let feedback = "";
  let isValid = false;

  const coreMet = hasMinLength && (hasUppercase || hasLowercase) && hasNumber;
  const adminCoreMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSymbol;

  if (isForbidden) {
    level = "weak";
    label = "Weak";
    color = "rose";
    feedback = "This is a commonly used password and is too easily guessed.";
    isValid = false;
  } else if (role === "admin") {
    if (!hasMinLength) {
      level = "weak";
      label = "Weak";
      color = "rose";
      feedback = `Needs at least ${minLength - clean.length} more character${minLength - clean.length > 1 ? "s" : ""}.`;
    } else if (!adminCoreMet || score < 65) {
      level = "good";
      label = "Good";
      color = "amber";
      feedback = !hasSymbol
        ? "Add a special symbol (!@#$) for stronger admin protection."
        : "Good password. Increase length for maximum security.";
      isValid = hasMinLength && (hasUppercase || hasLowercase) && hasNumber;
    } else {
      level = "strong";
      label = "Strong";
      color = "emerald";
      feedback = "Excellent! Meets high-assurance administrator security standards.";
      isValid = true;
    }
  } else {
    // Student role
    if (!hasMinLength) {
      level = "weak";
      label = "Weak";
      color = "rose";
      feedback = `Needs at least ${minLength - clean.length} more character${minLength - clean.length > 1 ? "s" : ""}.`;
    } else if (!coreMet || score < 60) {
      level = clean.length >= 8 && (hasNumber || hasUppercase) ? "good" : "weak";
      label = level === "good" ? "Good" : "Weak";
      color = level === "good" ? "amber" : "rose";
      feedback = !hasNumber
        ? "Add numbers to make your password stronger."
        : "Good password. Adding symbols will make it stronger.";
      isValid = hasMinLength;
    } else {
      level = "strong";
      label = "Strong";
      color = "emerald";
      feedback = "Strong password! Your student account is well protected.";
      isValid = true;
    }
  }

  // Progress bar percentage mapping
  let progressPercent = 33;
  if (level === "good") progressPercent = 66;
  if (level === "strong") progressPercent = 100;

  return {
    score,
    level,
    label,
    color,
    progressPercent,
    requirements,
    feedback,
    isValid,
  };
}

function evaluatePinStrength(clean: string): PasswordStrengthResult {
  const isForbidden = FORBIDDEN_PINS.has(clean);
  const isRepeating = /^(.)\1+$/.test(clean);
  const hasMinLength = clean.length >= 4 && clean.length <= 12;
  const isRecommendedLength = clean.length >= 6;
  const uniqueChars = new Set(clean).size;
  const hasAlphanumeric = /[A-Za-z]/.test(clean);

  const requirements: PasswordRequirement[] = [
    {
      id: "pin-length",
      label: "4 to 12 characters",
      met: hasMinLength,
      required: true,
    },
    {
      id: "pin-recommended",
      label: "6+ characters recommended",
      met: isRecommendedLength,
      required: false,
    },
    {
      id: "pin-variety",
      label: "Varied digits/characters",
      met: !isRepeating && uniqueChars >= 3,
      required: true,
    },
    {
      id: "pin-unique",
      label: "Not a common sequence (1234, 1111)",
      met: !isForbidden,
      required: true,
    },
  ];

  if (!hasMinLength) {
    return {
      score: 15,
      level: "weak",
      label: "Weak",
      color: "rose",
      progressPercent: 20,
      requirements,
      feedback: clean.length < 4 ? "PIN must be at least 4 digits." : "PIN cannot exceed 12 digits.",
      isValid: false,
    };
  }

  if (isForbidden || (isRepeating && clean.length >= 4)) {
    return {
      score: 20,
      level: "weak",
      label: "Weak",
      color: "rose",
      progressPercent: 25,
      requirements,
      feedback: "This PIN is too common or repeating and easily guessed.",
      isValid: false,
    };
  }

  if (clean.length < 6 || (clean.length < 8 && uniqueChars < 3)) {
    return {
      score: 55,
      level: "weak",
      label: "Weak",
      color: "rose",
      progressPercent: 40,
      requirements,
      feedback: "Acceptable length, but 6+ varied characters are recommended for admin PINs.",
      isValid: true,
    };
  }

  if (clean.length >= 6 && clean.length < 8) {
    return {
      score: 75,
      level: "good",
      label: "Good",
      color: "amber",
      progressPercent: 70,
      requirements,
      feedback: "Good PIN. Increase to 8+ characters for maximum security.",
      isValid: true,
    };
  }

  // Length >= 8
  return {
    score: hasAlphanumeric || uniqueChars >= 4 ? 95 : 85,
    level: "strong",
    label: "Strong",
    color: "emerald",
    progressPercent: 100,
    requirements,
    feedback: "Strong PIN! Master governance controls are well protected.",
    isValid: true,
  };
}

function getBaseRequirements(clean: string, role: PasswordRole): PasswordRequirement[] {
  if (role === "pin") {
    return [
      {
        id: "pin-length",
        label: "4 to 12 characters",
        met: clean.length >= 4 && clean.length <= 12,
        required: true,
      },
      {
        id: "pin-recommended",
        label: "6+ characters recommended",
        met: clean.length >= 6,
        required: false,
      },
      {
        id: "pin-variety",
        label: "Varied digits/characters",
        met: false,
        required: true,
      },
      {
        id: "pin-unique",
        label: "Not a common sequence",
        met: true,
        required: true,
      },
    ];
  }

  const minLength = role === "admin" ? 10 : 8;
  return [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      met: clean.length >= minLength,
      required: true,
    },
    {
      id: "letters",
      label: "Uppercase & lowercase letters",
      met: false,
      required: true,
    },
    {
      id: "numbers",
      label: "At least one number (0-9)",
      met: false,
      required: true,
    },
    {
      id: "symbols",
      label: "Special symbol (e.g. !@#$%^&*)",
      met: false,
      required: role === "admin",
    },
  ];
}
