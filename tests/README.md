# Testing Guide

Bo kiem thu tap trung vao cac nghiep vu chinh cua he thong quan ly bat dong san:

- Auth Service: dang ky, OTP, dang nhap, quen mat khau.
- Listing Service: tim kiem/loc tin public, xem chi tiet va tang luot xem.
- Contact Service: Buyer gui lien he, Owner phan hoi, luu tin yeu thich.
- Property Service: dang tin, AI goi y mo ta, duyet/tu choi, lich su trang thai, goi noi bat.

## Cai dependency test

Chay mot lan cho tung service:

~~~bash
cd services/auth-service && npm install
cd ../listing-service && npm install
cd ../contact-service && npm install
cd ../property-service && npm install
~~~

## Chay test

~~~bash
cd services/auth-service && npm test
cd ../listing-service && npm test
cd ../contact-service && npm test
cd ../property-service && npm test
~~~

## Chay coverage

~~~bash
cd services/auth-service && npm run test:coverage
cd ../listing-service && npm run test:coverage
cd ../contact-service && npm run test:coverage
cd ../property-service && npm run test:coverage
~~~
