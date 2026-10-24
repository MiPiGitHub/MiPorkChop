// Called inside the shared Durable Object transaction: one authority for all views.
export function garageStatus(sql,now=Date.now()){
 const device=[...sql.exec('SELECT state,seen FROM garage WHERE id=1')][0];
 const manual=[...sql.exec('SELECT state,changed FROM manual_garage WHERE id=1')][0];
 const deviceAvailable=!!device&&['OPEN','CLOSED'].includes(device.state)&&Number.isFinite(device.seen)&&device.seen<=now+30000&&now-device.seen<=450000;
 const clock=[...sql.exec('SELECT changed FROM garage_clock WHERE id=1')][0];
 const source=deviceAvailable?'physical-switch':manual?'manual':null;
 return {state:deviceAvailable?device.state:manual?.state??'UNKNOWN',source,deviceAvailable,
  lastSeen:device?.seen?new Date(device.seen).toISOString():null,
  lastChanged:source?new Date(deviceAvailable?(clock?.changed??device.seen):manual.changed).toISOString():null,
  confirmedAt:new Date(now).toISOString()};
}
export function clearAttendance(sql){
 for(const table of ['visits','inbound','manual_counts'])sql.exec('DELETE FROM '+table);
}
