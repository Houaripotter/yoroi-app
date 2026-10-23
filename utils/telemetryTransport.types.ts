/** Contrat du transport de la mesure : la coquille et le transport reel le respectent tous les deux. */
export interface Transport {
  /** Vrai seulement quand Firebase est reellement branche */
  disponible: boolean;
  init(actif: boolean): Promise<void>;
  setActif(actif: boolean): Promise<void>;
  evenement(nom: string, params?: Record<string, string>): Promise<boolean>;
  filAriane(nom: string, params?: Record<string, string>): void;
  proprietes(p: Record<string, string | undefined>): void;
  idInstance(): Promise<string | null>;
}
