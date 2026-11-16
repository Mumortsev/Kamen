import Hero from '@/components/Hero';
import Navigation from '@/components/Navigation';
import Marketing,{AboutAndFAQ} from '@/components/Marketing';
import Calculator from '@/components/Calculator';
import RequestForm from '@/components/RequestForm';
import Footer from '@/components/Footer';
import {getCatalog} from '@/lib/catalog-data';
import company from '@/data/company.json';
export const metadata={alternates:{canonical:'/'}};
export default async function Home(){
 const catalog=await getCatalog();const {products}=catalog;
 const calculatorProducts=products.filter(p=>p.calculator!==false&&p.unit).map(({id,name,terms,price,unit,categories,variants,minimumOrder,density,packSize,saleMode,densityConfirmed,images})=>({id,name,terms,price,unit,categories,variants,minimumOrder,density,packSize,saleMode,densityConfirmed,images:images.slice(0,1)}));
 const jsonLd={'@context':'https://schema.org','@type':'Store',name:company.name,url:process.env.SITE_URL||company.source,telephone:company.phoneHref,email:company.email,address:{'@type':'PostalAddress',streetAddress:'ул. Северная, 26, пос. Южный',addressLocality:'Краснодар',addressCountry:'RU'}};
 return <><Hero/><Navigation fixed/><main className="site-content" id="content" tabIndex={-1}><Marketing catalog={catalog}/><Calculator categories={catalog.categories} products={calculatorProducts} revision={catalog.revision||1} updatedAt={catalog.checkedAt}/><RequestForm/><AboutAndFAQ/></main><div className="site-content"><Footer/></div><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/></>;
}
