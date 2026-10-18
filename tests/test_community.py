import io,json,sys,tempfile,unittest,zipfile,threading,time
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'src'))
from start import prepare
from studio_library import library
from agent_service import AgentService
from project_state import read,commit,backup
from project_import import import_project
from creation_service import CreationService
class CommunityTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.home=Path(self.temp.name);self.root=prepare(self.home/'alice');self.agent=AgentService(self.root,self.home/'private-alice')
 def tearDown(self):self.temp.cleanup()
 def clone(self,index=0):return self.agent.clone(library(self.root)['templates'][index]['id'],'独立测试作品')['project']
 def test_seven_templates_and_separate_users(self):
  other=prepare(self.home/'bob');self.assertEqual(len(library(self.root)['templates']),7);self.assertEqual(library(self.root)['projects'],[]);self.clone();self.assertEqual(len(library(self.root)['projects']),1);self.assertEqual(library(other)['projects'],[]);prepare(self.home/'alice');self.assertEqual(len(library(self.root)['projects']),1)
 def test_all_templates_clone_and_keep_original_read_only(self):
  for i,t in enumerate(library(self.root)['templates']):
   d=self.clone(i);self.assertNotEqual(d['id'],t['id']);state=read(self.root,t['id'])
   with self.assertRaises(ValueError):commit(self.root,t['id'],dict(baseRevision=state['current']['revision'],settings={**state['current']['settings'],'speed':1.25}))
 def test_backup_restores_edits_and_excludes_credentials(self):
  d=self.clone();state=read(self.root,d['id']);settings={**state['current']['settings'],'speed':.75,'style':'dots'};commit(self.root,d['id'],dict(baseRevision=state['current']['revision'],settings=settings,label='test',actor='editor'));self.agent.configure(dict(provider='api',baseUrl='https://example.com/v1',model='test',apiKey='not-a-real-key',protocol='chat',vision=False));content=backup(self.root,d['id'])
  with zipfile.ZipFile(io.BytesIO(content)) as z:self.assertTrue(all(n=='project.json' or n.startswith('assets/') for n in z.namelist()));self.assertNotIn(b'not-a-real-key',z.read('project.json'))
  dest=self.home/'restore';dest.mkdir();result=import_project(content,dest)['project'];self.assertEqual(result['initialSettings']['speed'],.75);self.assertEqual(result['initialSettings']['style'],'dots')
 def test_new_static_and_shape_motion(self):
  service=CreationService(self.agent);draft=service.create(dict(brief='新建水母',plan=dict(subjectKind='jellyfish')));pid=service.compose(draft['id'])['project']['id'];state=read(self.root,pid);service.transition(pid,dict(action='confirm-static',revision=state['current']['revision']));state=read(self.root,pid);service.transition(pid,dict(action='animate',revision=state['current']['revision'],motion='swim',titleMotion=True,captionMotion=True));state=read(self.root,pid);self.assertEqual(next(l for l in state['current']['settings']['layers'] if l['type']=='characterform')['formMotion'],'swim')
 def test_own_api_tool_edit_without_real_key(self):
  calls=[]
  class FakeProvider(BaseHTTPRequestHandler):
   def log_message(self,*a):pass
   def do_POST(self):
    body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));calls.append(body);n=len(calls);call=({'name':'studio_read_project','arguments':'{}'} if n==1 else {'name':'studio_edit_project','arguments':json.dumps(dict(expected_revision=0,patch_json=json.dumps({'settings':{'speed':1.25}}),label='测试调速'))});message={'role':'assistant','content':'API连接与编辑正常' if n>=3 else None}
    if n<3:message['tool_calls']=[dict(id='call-'+str(n),type='function',function=call)]
    raw=json.dumps({'choices':[{'message':message}]}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
  server=ThreadingHTTPServer(('127.0.0.1',0),FakeProvider);threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   d=self.clone();self.agent.configure(dict(provider='api',baseUrl='http://127.0.0.1:'+str(server.server_port),model='test-model',apiKey='',protocol='chat',vision=False));result=self.agent.start(dict(project=d['id'],message='把速度改为1.25',references=[]))
   for _ in range(200):
    job=self.agent.jobs[result['id']]
    if job.state!='running':break
    time.sleep(.03)
   self.assertEqual(job.state,'completed',job.reply);self.assertEqual(read(self.root,d['id'])['current']['settings']['speed'],1.25);self.assertGreaterEqual(len(calls),3)
  finally:server.shutdown();server.server_close()
 def test_encoder_present(self):
  import imageio_ffmpeg,subprocess
  p=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-version'],capture_output=True,timeout=15);self.assertEqual(p.returncode,0)
if __name__=='__main__':unittest.main()
