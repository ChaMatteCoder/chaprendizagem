import { useContext } from 'react';
import { SonarMissionContext } from './SonarMissionContext.js';
export default function useSonarMission() { return useContext(SonarMissionContext); }
