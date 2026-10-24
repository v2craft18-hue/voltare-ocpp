// OCPP 1.6 JSON CALL validation. Durable storage must succeed before replying.
const statuses = new Set(['Available','Preparing','Charging','SuspendedEVSE','SuspendedEV','Finishing','Reserved','Unavailable','Faulted']);
const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const integer = (value, min=0) => Number.isSafeInteger(value) && value >= min;
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
export function validate(frame, connectors=2) {
  if (!Array.isArray(frame) || frame.length!==4 || frame[0]!==2 || !text(frame[1],36) || !text(frame[2],64) || !frame[3] || typeof frame[3]!=='object' || Array.isArray(frame[3])) throw new Error('FormationViolation');
  const [, , action,p] = frame;
  const connector = () => integer(p.connectorId) && p.connectorId<=connectors;
  let valid;
  switch(action) {
    case 'BootNotification': valid=text(p.chargePointVendor,20)&&text(p.chargePointModel,20); break;
    case 'Heartbeat': valid=Object.keys(p).length===0; break;
    case 'StatusNotification': valid=connector()&&statuses.has(p.status)&&typeof p.errorCode==='string'&&(!p.timestamp||stamp(p.timestamp)); break;
    case 'Authorize': valid=text(p.idTag,20); break;
    case 'StartTransaction': valid=connector()&&p.connectorId>0&&text(p.idTag,20)&&integer(p.meterStart)&&stamp(p.timestamp); break;
    case 'StopTransaction': valid=integer(p.transactionId,1)&&integer(p.meterStop)&&stamp(p.timestamp); break;
    case 'MeterValues': valid=connector()&&(!('transactionId'in p)||integer(p.transactionId,1))&&Array.isArray(p.meterValue)&&p.meterValue.length>0&&p.meterValue.length<=100&&p.meterValue.every(m=>stamp(m.timestamp)&&Array.isArray(m.sampledValue)&&m.sampledValue.length>0&&m.sampledValue.length<=100&&m.sampledValue.every(s=>typeof s.value==='string'&&s.value.length<=100)); break;
    case 'DataTransfer': valid=text(p.vendorId,255); break;
    default: throw new Error('NotImplemented');
  }
  if (!valid) throw new Error('PropertyConstraintViolation');
  return {messageId:frame[1],action,payload:p};
}
export function measurements(payload) {
  const values=[];
  for(const m of payload.meterValue||[]) for(const s of m.sampledValue||[]) {
    if(s.format==='SignedData'||s.phase||s.location&&s.location!=='Outlet')continue;
    const value=Number(s.value); if(!Number.isFinite(value)||value<0)continue;
    const type=s.measurand||'Energy.Active.Import.Register';
    const unit=s.unit||'Wh'; let field, normalized;
    if(type==='Energy.Active.Import.Register'&&['Wh','kWh'].includes(unit)){field='meterWh';normalized=value*(unit==='kWh'?1000:1)}
    if(type==='Power.Active.Import'&&['W','kW'].includes(unit)){field='powerW';normalized=value*(unit==='kW'?1000:1)}
    if(type==='SoC'&&s.unit==='Percent'&&value<=100){field='soc';normalized=value}
    if(field)values.push({field,value:normalized,timestamp:m.timestamp});
  }
  return values;
}
