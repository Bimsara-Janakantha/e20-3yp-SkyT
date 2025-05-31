-- initial user
INSERT INTO USERS (email, password, role, fName, lName) 
VALUES ('0000sampleemail0000@gmail.com', 'hello', 'Developer', 'SkyT', 'WebAdmin');

INSERT INTO USERS (email, password, role, fName, lName) 
VALUES ('econductorinfo@gmail.com', 'hello', 'Owner', 'John', 'Doe');



-- Dummy Estates
INSERT INTO ESTATES (estate, address, managerId, lat, lng)
VALUES 
('Hilltop Tea Estate', 'Peradeniya Rd, Kandy, Sri Lanka', 2, 7.271500000000000, 80.598000000000000),
('Green Valley Estate', 'Gampola Rd, Kandy, Sri Lanka', 2, 7.248600000000000, 80.579800000000000),
('Emerald Hills Estate', 'Galaha Rd, Kandy, Sri Lanka', 2, 7.232300000000000, 80.614400000000000),
('Golden Leaf Estate', 'Ampitiya Rd, Kandy, Sri Lanka', 2, 7.281000000000000, 80.637000000000000),
('Peradeniya Estate', 'Gampola Rd, Peradeniy, Sri Lanka', 2,  7.25428689533961, 80.59264657706724);
