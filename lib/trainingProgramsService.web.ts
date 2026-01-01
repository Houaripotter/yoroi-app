// Web stub - SQLite training programs not supported on web
import logger from '@/lib/security/logger';
logger.warn('trainingProgramsService: SQLite operations not supported on web platform');

export const getAllPrograms = async () => [];
export const getProgramById = async (id: number) => null;
export const addProgram = async (program: any) => 0;
export const updateProgram = async (id: number, program: any) => {};
export const deleteProgram = async (id: number) => {};
export const getProgramSessions = async (programId: number) => [];
export const addProgramSession = async (session: any) => 0;
export const updateProgramSession = async (id: number, session: any) => {};
export const deleteProgramSession = async (id: number) => {};
