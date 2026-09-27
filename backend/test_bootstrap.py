"""Isolated API/SQLite checks; never open the deployment database or read .env."""
import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

WORK = tempfile.TemporaryDirectory(prefix='spiderportfolio-check-')
os.environ.update(SECRET_KEY='isolated-test-secret', SUPERADMIN_PASSWORD='isolated-test-password',
                  DATABASE_URL=f'sqlite:///{WORK.name}/initial.db', MEDIA_PATH=f'{WORK.name}/media')
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
import main
from bootstrap import initialize_content, digest, PREVIOUS_SEED_DIGEST
from content_migration import BLOCK_TYPES

PROFILE = dict(name='María Pérez',profession='Diseño',email='maria@example.org',title='',description='Portfolio profesional',theme='crimson')


def all_blocks(document):
    def walk(block):
        yield block
        for child in block['props'].get('content', []):
            yield from walk(child)
    for block in document['content']:
        yield from walk(block)


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(dir=WORK.name)
        main.engine = create_engine(f'sqlite:///{self.directory.name}/test.db')
        self.client = TestClient(main.app).__enter__()

    def tearDown(self):
        self.client.__exit__(None,None,None)
        main.engine.dispose()
        self.directory.cleanup()

    def login(self):
        self.assertEqual(self.client.post('/api/auth/login',json={'username':'superadmin','password':'isolated-test-password'}).status_code,200)

    def test_first_run_setup_and_restart(self):
        site=self.client.get('/api/public/site').json()
        self.assertTrue(site['setup_required'])
        self.assertEqual(site['name'],'')
        self.assertEqual(site['email'],'')
        self.assertEqual(self.client.get('/api/public/pages/home').status_code,404)
        self.assertEqual(self.client.post('/api/setup',json=PROFILE).status_code,401)
        self.login()
        self.assertEqual(self.client.post('/api/setup',json={**PROFILE,'name':' '}).status_code,422)
        result=self.client.post('/api/setup',json=PROFILE)
        self.assertEqual(result.status_code,200,result.text)
        self.assertFalse(result.json()['setup_required'])
        self.assertEqual(result.json()['title'],PROFILE['name'])
        home=self.client.get('/api/public/pages/home').json()['content']
        self.assertEqual(len(home['content']),6)
        blocks=list(all_blocks(home))
        self.assertTrue(all(b['type'] in BLOCK_TYPES for b in blocks))
        self.assertFalse(any('binding' in b['props'] for b in blocks))
        self.assertIn(PROFILE['name'],[b['props'].get('text') for b in blocks])
        self.assertIn('mailto:'+PROFILE['email'],[b['props'].get('url') for b in blocks])
        self.assertEqual(self.client.post('/api/setup',json=PROFILE).status_code,409)
        initialize_content(main.engine, main.now)
        self.assertEqual(self.client.get('/api/public/pages/home').json()['content'],home)
        self.assertEqual(len(self.client.get('/api/pages').json()),1)

    def test_existing_documents_are_converted_once_and_backed_up(self):
        self.login()
        self.client.post('/api/setup',json=PROFILE)
        old={'root':{},'content':[{'type':'Hero','props':{'id':'old-hero','title':'Mi trabajo','description':'Texto propio','link':'#contacto','button':'Contacto','appearance':{'color':'#123456'}}}]}
        page=self.client.get('/api/pages').json()[0]
        main.run('UPDATE pages SET draft=:content,published=:content WHERE id=:id',{'id':page['id'],'content':json.dumps(old)})
        main.run('INSERT INTO components VALUES (:id,:name,:content,:date)',{'id':'saved','name':'Guardada','content':json.dumps(old['content'][0]),'date':main.now()})
        initialize_content(main.engine,main.now)
        current=self.client.get('/api/pages').json()[0]
        self.assertEqual(current['draft']['content'][0]['type'],'Container')
        self.assertEqual(current['draft']['content'][0]['props']['id'],'old-hero')
        self.assertEqual(current['draft']['content'][0]['props']['appearance']['color'],'#123456')
        self.assertIn('Mi trabajo',[b['props'].get('text') for b in all_blocks(current['draft'])])
        self.assertEqual(self.client.get('/api/components').json()[0]['content']['type'],'Container')
        backups=main.run('SELECT * FROM content_backups')
        self.assertEqual(len(backups),3)
        initialize_content(main.engine,main.now)
        self.assertEqual(self.client.get('/api/pages').json()[0],current)
        self.assertEqual(main.run('SELECT * FROM content_backups'),backups)

    def test_existing_custom_profile_skips_setup_and_is_preserved(self):
        old={**PROFILE,'title':'Sitio personal'}
        main.run('UPDATE settings SET content=:content WHERE id=1',{'content':json.dumps(old)})
        initialize_content(main.engine,main.now)
        site=self.client.get('/api/public/site').json()
        self.assertFalse(site['setup_required'])
        for key,value in old.items(): self.assertEqual(site[key],value)

    def test_saved_sections_reject_retired_components(self):
        self.login()
        invalid={'name':'Antigua','content':{'type':'Hero','props':{'id':'old'}}}
        self.assertEqual(self.client.post('/api/components',json=invalid).status_code,422)


if __name__=='__main__':
    unittest.main()
