import os,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'implementation'))
from fastapi.testclient import TestClient
from app import app
c=TestClient(app)
def get(path,user='director',**params):return c.get('/api/v1/dashboard/'+path,headers={'x-user-id':user},params=params)
def test_unauthenticated():assert c.get('/api/v1/dashboard/summary').status_code==401
def test_forbidden():assert get('summary','outsider').status_code==403
def test_cross_customer_blocked():assert get('summary','engineer',customer_id='B').status_code==403
def test_scoped_summary():
    d=get('summary','engineer').json();assert d['active_projects']==2 and d['open_tickets']==2 and d['sla_at_risk']==1 and d['sla_breached']==0
    assert d['overall_progress_pct']==73.33
    assert d['context']['authorized_customers']==['A']
def test_ticket_status_exclusive():
    d=get('ticket-status').json();assert d['total']==sum(x['count'] for x in d['buckets'])==3
    assert {x['status'] for x in d['buckets']}=={'new','in_progress','waiting'}
def test_all_endpoints_scoped():
    for name in ['summary','projects','ticket-status','incidents','ticket-trend']:
        r=get(name,'engineer');assert r.status_code==200 and r.json()['context']['authorized_customers']==['A']
def test_trend_metric():assert get('ticket-trend').json()['metric']=='created'
