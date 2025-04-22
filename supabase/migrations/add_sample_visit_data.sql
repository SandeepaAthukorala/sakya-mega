/*
  # Add sample visit data to visits table

  1. New Data
    - Added 6 sample visit records near Kurunegala, Sri Lanka
  2. Security
    - No security changes
*/

INSERT INTO visits (ref_id, buyer_name, phone, location, date, type, status) VALUES
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Nimal Silva', '0771234567', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-20T08:00:00+00:00', 'Delivery', 'Pending'),
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Kamal Perera', '0719876543', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-21T10:00:00+00:00', 'Collection', 'Completed'),
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Saman Fernando', '0753456789', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-22T12:00:00+00:00', 'Delivery', 'Pending'),
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Amara Dissanayake', '0726543210', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-23T14:00:00+00:00', 'Collection', 'Completed'),
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Ruwan Rajapakse', '0701122334', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-24T16:00:00+00:00', 'Delivery', 'Pending'),
('07e3693e-7db1-4d86-ad56-0b64e8d05a22', 'Deepika Kumari', '0789990001', '{"lat": 7.4866, "lng": 80.3609, "address": "Kurunegala"}', '2024-07-25T18:00:00+00:00', 'Collection', 'Cancelled');