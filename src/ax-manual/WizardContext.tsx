import { createContext, useContext, useState } from "react";

interface WizardState {
  companyName: string;
  setCompanyName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  taskType: string;
  setTaskType: (v: string) => void;
  uploadText: string;
  setUploadText: (v: string) => void;
}

const WizardContext = createContext<WizardState>({} as WizardState);
export const useWizard = () => useContext(WizardContext);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [taskType, setTaskType] = useState("cs");
  const [uploadText, setUploadText] = useState("");

  return (
    <WizardContext.Provider value={{ companyName, setCompanyName, email, setEmail, taskType, setTaskType, uploadText, setUploadText }}>
      {children}
    </WizardContext.Provider>
  );
}
