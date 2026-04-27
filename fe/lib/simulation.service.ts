import { apiClient } from './api-client';

export interface CareerSimulationLevel {
  id: string;
  label: string;
  emoji: string;
  salaryRange: string;
  yearRange: string;
  nextLevel: string;
  skills: { name: string; color: string }[];
  tasks?: string[];
  dailyTasks?: string[];
  daySchedule?: string;
  typicalSchedule?: { time: string; activity: string }[];
  challenge?: string;
  challenges?: string[];
  tip?: string;
  tips?: string[];
}

export interface CareerSimulationData {
  id: string;
  label: string;
  levels: CareerSimulationLevel[];
}

export interface TopCareer {
  title: string;
  fitScore: number;
  strengths: string[];
  personalityTraits: string[];
}

class SimulationService {
  async getTopCareers(token: string): Promise<TopCareer[]> {
    return apiClient.get<TopCareer[]>('/career-simulation/top-careers', token);
  }

  async getSimulation(careerTitle: string, token: string): Promise<CareerSimulationData> {
    return apiClient.get<CareerSimulationData>(`/career-simulation/${encodeURIComponent(careerTitle)}`, token);
  }
}

export const simulationService = new SimulationService();
