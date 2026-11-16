import {scrypt as derive,randomBytes,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>200)throw Error('Пароль должен содержать от 12 до 200 символов.');const salt=randomBytes(24).toString('hex');const hash=await scrypt(password,salt,64);return `${salt}:${hash.toString('hex')}`;}
const dummy='0'.repeat(48)+':'+'0'.repeat(128);
export async function verifyPassword(password,stored){if(typeof password!=='string'||password.length>200)return false;const [salt,hex]=(stored||dummy).split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(hex,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual)&&!!stored;}
