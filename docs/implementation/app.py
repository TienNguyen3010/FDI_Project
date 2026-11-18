"""Executable reference Dashboard API. SQLite seed for tests; PostgreSQL migration remains separate."""
from datetime import datetime,timezone
from fastapi import FastAPI,Depends,HTTPException,Header,Query
from pydantic import BaseModel
from typing import Optional
import sqlite3,os
DB=os.environ.get('PROJECT_OPS_DB',':memory:')
app=FastAPI(title='Project OPS Dashboard Reference',version='1.5.0')
CONN=sqlite3.connect(DB,check_same_thread=False)
CONN.row_factory=sqlite3.Row
CONN.executescript("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, role TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS grants(user_id TEXT NOT NULL, customer_id TEXT NOT NULL, permission TEXT NOT NULL, PRIMARY KEY(user_id,customer_id,permission));\nCREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,baseline_weight REAL NOT NULL,completion REAL NOT NULL);\nCREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,status TEXT NOT NULL,priority TEXT NOT NULL, sla_state TEXT NOT NULL,created_date TEXT NOT NULL);\nINSERT OR IGNORE INTO users VALUES ('director','director'),('engineer','engineer'),('outsider','engineer');\nINSERT OR IGNORE INTO grants VALUES ('director','A','dashboard.read'),('director','B','dashboard.read'),('engineer','A','dashboard.read');\nINSERT OR IGNORE INTO projects VALUES ('P1','A','Office Network','active',2,80),('P2','A','VoIP Deployment','active',1,60),('P3','B','Data Center','active',1,40);\nINSERT OR IGNORE INTO tickets VALUES ('T1','A','in_progress','P1','at_risk','2026-11-16'),('T2','A','waiting','P2','healthy','2026-11-17'),('T3','B','new','P1','breached','2026-11-18');")
CONN.commit()
class Context(BaseModel):
    as_of:str
    authorized_customers:list[str]
    demo_data:bool=True

def actor(x_user_id:Optional[str]=Header(None)):
    if not x_user_id:raise HTTPException(401,'Missing user identity (demo only)')
    row=CONN.execute('SELECT id FROM users WHERE id=?',(x_user_id,)).fetchone()
    if not row:raise HTTPException(401,'Unknown user')
    return x_user_id

def scope(user:str,customer_id:Optional[str]):
    allowed=[r['customer_id'] for r in CONN.execute('SELECT customer_id FROM grants WHERE user_id=? AND permission=?',(user,'dashboard.read'))]
    if not allowed:raise HTTPException(403,'dashboard.read denied')
    if customer_id:
        if customer_id not in allowed:raise HTTPException(403,'customer scope denied')
        return [customer_id]
    return allowed

def rows(table,allowed):
    q=','.join('?' for _ in allowed)
    return [dict(r) for r in CONN.execute(f'SELECT * FROM {table} WHERE customer_id IN ({q})',allowed)]

def context(allowed):return Context(as_of=datetime.now(timezone.utc).isoformat(),authorized_customers=allowed).model_dump()
@app.get('/api/v1/dashboard/summary')
def summary(customer_id:Optional[str]=None,user:str=Depends(actor)):
    allowed=scope(user,customer_id);p=[x for x in rows('projects',allowed) if x['status']=='active'];t=rows('tickets',allowed)
    w=sum(x['baseline_weight'] for x in p); progress=round(sum(x['baseline_weight']*x['completion'] for x in p)/w,2) if w else None
    return {'context':context(allowed),'active_projects':len(p),'overall_progress_pct':progress,'progress_coverage':len(p),'open_tickets':sum(x['status'] not in ('closed','resolved') for x in t),'sla_at_risk':sum(x['sla_state']=='at_risk' for x in t),'sla_breached':sum(x['sla_state']=='breached' for x in t)}
@app.get('/api/v1/dashboard/projects')
def projects(customer_id:Optional[str]=None,user:str=Depends(actor)):
    allowed=scope(user,customer_id);return {'context':context(allowed),'items':rows('projects',allowed)}
@app.get('/api/v1/dashboard/ticket-status')
def ticket_status(customer_id:Optional[str]=None,user:str=Depends(actor)):
    allowed=scope(user,customer_id);t=[x for x in rows('tickets',allowed) if x['status'] not in ('closed','resolved')]; statuses=('new','in_progress','waiting')
    return {'context':context(allowed),'total':len(t),'buckets':[{'status':s,'count':sum(x['status']==s for x in t)} for s in statuses]}
@app.get('/api/v1/dashboard/incidents')
def incidents(customer_id:Optional[str]=None,user:str=Depends(actor)):
    allowed=scope(user,customer_id);return {'context':context(allowed),'items':[x for x in rows('tickets',allowed) if x['priority'] in ('P1','P2') and x['status'] not in ('resolved','closed')]}
@app.get('/api/v1/dashboard/ticket-trend')
def ticket_trend(customer_id:Optional[str]=None,user:str=Depends(actor)):
    allowed=scope(user,customer_id);t=rows('tickets',allowed);days=sorted(set(x['created_date'] for x in t));return {'context':context(allowed),'metric':'created','items':[{'date':d,'count':sum(x['created_date']==d for x in t)} for d in days]}
