import { Router } from 'express';
import {
  createProject,
  createProjectChunk,
  getAllProjects,
  getProject,
  updateProject,
  updateProjectChunk,
} from '../controllers/projectController';
import { requirePermission } from '../middleware/authorize';

const router = Router();

router.post('/', requirePermission('project', 'create'), createProject); // Only Admin creates project + assigns PM
router.post('/chunks', requirePermission('project', 'chunk_create'), createProjectChunk); // Project Manager delegates chunk to Dept
router.patch('/chunks/:chunkId', requirePermission('project', 'chunk_create'), updateProjectChunk); // Project Manager edits chunk
router.get('/', getAllProjects);
router.get('/:id', getProject);
router.patch('/:id', requirePermission('project', 'edit'), updateProject);

export default router;
