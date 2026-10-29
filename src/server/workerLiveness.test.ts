import {it,expect,vi,afterEach} from 'vitest';
vi.mock('node:fs/promises',()=>({readFile:vi.fn()}));
import {readFile} from 'node:fs/promises';
import {workerIsAlive} from './workerLiveness';
afterEach(()=>{vi.restoreAllMocks();vi.resetAllMocks();});
it('recognizes the actual live process independently of stale progress metadata',async()=>{vi.mocked(readFile).mockResolvedValueOnce(String(process.pid));expect(await workerIsAlive('fixed-lock')).toBe(true);});
it('distinguishes absent and exited workers from invalid locks',async()=>{vi.mocked(readFile).mockRejectedValueOnce(Object.assign(new Error('missing'),{code:'ENOENT'}));expect(await workerIsAlive('fixed-lock')).toBe(false);vi.mocked(readFile).mockResolvedValueOnce('1234');vi.spyOn(process,'kill').mockImplementation(()=>{throw Object.assign(new Error('gone'),{code:'ESRCH'});});expect(await workerIsAlive('fixed-lock')).toBe(false);vi.mocked(readFile).mockResolvedValueOnce('NaN');await expect(workerIsAlive('fixed-lock')).rejects.toThrow('WORKER_LOCK_INVALID');});
