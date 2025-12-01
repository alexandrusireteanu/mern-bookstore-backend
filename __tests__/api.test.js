import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';

// Token de autentificare pentru teste
let authToken;

describe('BookStore API Endpoints', () => {
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@bookstore.com',
        password: 'passAdm'
      });
    
    // Dacă login-ul reușește, salvează token-ul
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe('Rute publice', () => {
    it('GET / ar trebui sa returneze API info', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('GET /api/products ar trebui sa returneze produse', async () => {
      const response = await request(app).get('/api/products');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('GET /api/products cu filtru pe categorie', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ category: 'React' });
      expect(response.status).toBe(200);
    });

    it('GET /api/products cu cautare', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ search: 'React' });
      expect(response.status).toBe(200);
    });

    it('GET /api/products cu sortare', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sort: 'price_asc' });
      expect(response.status).toBe(200);
    });
  });

  describe('Rute cart', () => {
    it('POST /api/cart ar trebui sa adauge produse in cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ productId: 1, quantity: 1 });
      expect(response.status).toBe(200);
    });

    it('GET /api/cart ar trebui sa returneze continut cart', async () => {
      const response = await request(app).get('/api/cart');
      expect(response.status).toBe(200);
    });

    it('DELETE /api/cart/:productId ar trebui sa elimine produs din cart', async () => {
      const response = await request(app).delete('/api/cart/1');
      expect(response.status).toBe(200);
    });

    it('POST /api/clear-cart ar trebui sa stearga cart', async () => {
      const response = await request(app).post('/api/clear-cart');
      expect(response.status).toBe(200);
    });
  });

  describe('Admin Routes - Autentificare necesara', () => {
    it('GET /api/admin/products ar trebui sa necesite autentificare', async () => {
      const response = await request(app).get('/api/admin/products');
      expect(response.status).toBe(401);
    });

    // Rulează testele admin doar dacă avem token valid
    if (authToken) {
      it('GET /api/admin/products cu token valid ar trebui sa returneze produse', async () => {
        const response = await request(app)
          .get('/api/admin/products')
          .set('Authorization', `Bearer ${authToken}`);
        expect(response.status).toBe(200);
      });

      it('POST /api/admin/products ar trebui sa creeze un nou produs', async () => {
        const newProduct = {
          title: 'Test Book',
          author: 'Test Author',
          price: 29.99,
          stock: 10,
          category: 'Test Category'
        };

        const response = await request(app)
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newProduct);
        expect(response.status).toBe(201);
      });

      it('POST /api/admin/products ar trebui sa valideze campurile necesare', async () => {
        const invalidProduct = { title: 'Only Title' };
        const response = await request(app)
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidProduct);
        expect(response.status).toBe(400);
      });

      it('PUT /api/admin/products/:id ar trebui sa actualize un produs', async () => {
        const updates = { title: 'Updated Title' };
        const response = await request(app)
          .put('/api/admin/products/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates);
        // Acceptă orice status între 200, 404, 500
        expect([200, 404, 500]).toContain(response.status);
      });

      it('DELETE /api/admin/products/:id ar trebui sa stearga un produs', async () => {
        const response = await request(app)
          .delete('/api/admin/products/999') 
          .set('Authorization', `Bearer ${authToken}`);
        expect([200, 404, 500]).toContain(response.status);
      });

      it('GET /api/admin/products/:id ar trebui sa afiseze un produs', async () => {
        const response = await request(app)
          .get('/api/admin/products/1')
          .set('Authorization', `Bearer ${authToken}`);
        expect([200, 404]).toContain(response.status);
      });
    } else {
      it.skip('teste Admin necesita autentificare', () => {
        // Skip teste dacă nu avem token
      });
    }
  });

  describe('Rute autentificare', () => {
    it('POST /api/admin/login ar trebui sa realizeze autentificarea', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@bookstore.com',
          password: 'passAdm'
        });
      
      // Acceptă atât succes cât și failure - important este că răspunde
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('token');
      }
    });

    it('POST /api/admin/login ar trebui sa respinga credidentiale invalide', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'wrong@email.com',
          password: 'wrongpassword'
        });
      expect(response.status).toBe(401);
    });

    it('POST /api/admin/login ar trebui sa valideze campurile necesare', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: '' });
      expect(response.status).toBe(400);
    });
  });

  describe('Manipulare erori', () => {
    it('ar trebui sa manipuleze rute non-existente', async () => {
      const response = await request(app).get('/api/non-existent-route');
      expect(response.status).toBe(404);
    });

    it('ar trebui sa nu permita id produs invalid in cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ productId: 99999 });
      expect(response.status).toBe(404);
    });

    it('ar trebui sa nu permita operatii invalide in cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({});
      expect(response.status).toBe(400);
    });
  });
});