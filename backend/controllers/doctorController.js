const Doctor = require('../models/Doctor');
const { resolveSpecialty } = require('../utils/specialityResolver');

exports.searchDoctors = async (req, res) => {
  try {
    const { specialty } = req.query;

    if (!specialty) {
      return res.status(400).json({ message: 'Specialty query parameter is required.' });
    }

    const resolvedSpecialties = await resolveSpecialty(specialty);

    for (const resolvedSpecialty of resolvedSpecialties) {
      let matchedDoctors = await Doctor.find({
        specialization: { $regex: new RegExp('\\b' + resolvedSpecialty.trim() + '\\b', 'i') },
        status: 'approved',
        isVerified: true
      }).lean();

      if (matchedDoctors.length < 4) {
        try {
          const { scrapeLybrateDoctors } = require('../services/lybrateScraper');
          const { geocodeAddress } = require('../utils/geocoder');

          const scrapedDocs = await scrapeLybrateDoctors('Bengaluru', resolvedSpecialty);

          if (scrapedDocs && scrapedDocs.length > 0) {
            const seen = new Set();
            const uniqueDocs = [];
            for (const doc of scrapedDocs) {
              const key = `${doc.name.toLowerCase().trim()}|${doc.specialty.toLowerCase().trim()}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueDocs.push(doc);
              }
            }

            for (const doc of uniqueDocs) {
              const exists = await Doctor.findOne({
                name: { $regex: new RegExp('^' + doc.name.trim() + '$', 'i') },
                specialization: { $regex: new RegExp('^' + doc.specialty.trim() + '$', 'i') }
              });

              if (!exists) {
                const coordinates = await geocodeAddress(doc.address);

                const nameSlug = doc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const specialtySlug = doc.specialty.toLowerCase().replace(/[^a-z0-9]/g, '');
                const placeholderPhone = 9000000000 + Math.floor(Math.random() * 999999999);

                await Doctor.create({
                  name: doc.name,
                  email: `${nameSlug}.${specialtySlug}@lybrate.scraped`,
                  password: 'scraped_placeholder_not_for_login',
                  phone: placeholderPhone,
                  specialization: doc.specialty,
                  experienceYears: doc.experience || 0,
                  consultationFee: doc.fee || 500,
                  isOnline: false,
                  status: 'approved',
                  isVerified: true,
                  address: doc.address || '',
                  location: {
                    type: 'Point',
                    coordinates,
                  },
                });
              }
            }

            matchedDoctors = await Doctor.find({
              specialization: { $regex: new RegExp('\\b' + resolvedSpecialty.trim() + '\\b', 'i') },
              status: 'approved',
              isVerified: true
            }).lean();
          }
        } catch (scrapeError) {
          console.error('❌ [Live Doctor Crawler] Failed:', scrapeError.message);
        }
      }

      if (matchedDoctors.length > 0) {
        const doctors = matchedDoctors.map(doc => ({
          doctorId: doc._id,
          name: doc.name,
          specialty: doc.specialization,
          specialization: doc.specialization,
          experience: doc.experienceYears,
          experienceYears: doc.experienceYears,
          fee: doc.consultationFee,
          consultationFee: doc.consultationFee,
          coordinates: doc.location ? doc.location.coordinates : null,
          activeHours: doc.activeHours,
          profileImage: doc.profileImage || '',
          isOnline: doc.isOnline,
          address: doc.address || doc.clinicName || '',
        }));

        return res.status(200).json({
          specialty: resolvedSpecialty,
          doctorsCount: doctors.length,
          doctors,
        });
      }
    }

    return res.status(200).json({
      specialty: specialty,
      doctorsCount: 0,
      doctors: [],
      message: "We couldn't find specialists for your request. Showing General Physicians may be the best next step."
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during doctor lookup.' });
  }
};


exports.compareDoctors = async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ message: 'Doctor ID parameters are required for comparative lookup.' });
    }

    const doctorIds = ids.split(',').filter(id => id.trim().length > 0);

    const doctorsList = await Doctor.find({ _id: { $in: doctorIds } });

    const formattedList = doctorsList.map(doc => ({
      ...doc._doc,
      specialty: doc.specialization,
      experience: doc.experienceYears,
      fee: doc.consultationFee,
      address: doc.address || doc.clinicName || '',
    }));

    res.status(200).json(formattedList);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error during doctor comparison matrix fetch.' });
  }
};
