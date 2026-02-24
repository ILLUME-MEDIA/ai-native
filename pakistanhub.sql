-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 19, 2026 at 03:17 AM
-- Server version: 10.6.25-MariaDB-log
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `n111145_development_cms`
--

-- --------------------------------------------------------

--
-- Table structure for table `pakistanhub`
--

CREATE TABLE `pakistanhub` (
  `id` int(11) NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `chain_name` text DEFAULT NULL,
  `city` text NOT NULL,
  `address` text NOT NULL,
  `hero_image` text NOT NULL,
  `vendor_legal_information_legal_name` text DEFAULT NULL,
  `vendor_legal_information_trade_register_number` text DEFAULT NULL,
  `accepts_instructions` tinyint(1) NOT NULL,
  `address_2` text DEFAULT NULL,
  `budget` int(11) NOT NULL,
  `custom_location_url` int(11) DEFAULT NULL,
  `customer_type` text NOT NULL,
  `delivery_box` int(11) DEFAULT NULL,
  `delivery_fee_type` text NOT NULL,
  `description` text DEFAULT NULL,
  `distance` double NOT NULL,
  `food_characteristics` text NOT NULL,
  `has_delivery_provider` tinyint(1) NOT NULL,
  `hero_listing_image` text NOT NULL,
  `is_new_until` text DEFAULT NULL,
  `premium_position` int(11) NOT NULL,
  `latitude` double NOT NULL,
  `logo` text DEFAULT NULL,
  `longitude` double NOT NULL,
  `loyalty_percentage_amount` double NOT NULL,
  `loyalty_program_enabled` tinyint(1) NOT NULL,
  `maximum_express_order_amount` int(11) NOT NULL,
  `minimum_delivery_fee` double NOT NULL,
  `minimum_delivery_time` double NOT NULL,
  `minimum_order_amount` double NOT NULL,
  `minimum_pickup_time` double NOT NULL,
  `zip` text DEFAULT NULL,
  `primary_cuisine_id` int(11) NOT NULL,
  `rating` double NOT NULL,
  `redirection_url` text NOT NULL,
  `review_count` int(11) NOT NULL,
  `review_with_comment_number` int(11) NOT NULL,
  `score` double NOT NULL,
  `service_fee_percentage_amount` int(11) NOT NULL,
  `service_tax_percentage_amount` int(11) NOT NULL,
  `tag` text DEFAULT NULL,
  `url_key` text NOT NULL,
  `vat_percentage_amount` int(11) NOT NULL,
  `vendor_points` int(11) NOT NULL,
  `vertical` text NOT NULL,
  `vertical_segment` text NOT NULL,
  `vertical_parent` text NOT NULL,
  `web_path` text NOT NULL,
  `website` int(11) DEFAULT NULL,
  `has_online_payment` tinyint(1) NOT NULL,
  `phone` text DEFAULT NULL,
  `delivery_provider` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `is_best_in_city` tinyint(1) NOT NULL,
  `is_checkout_comment_enabled` tinyint(1) NOT NULL,
  `is_delivery_enabled` tinyint(1) NOT NULL,
  `is_new` tinyint(1) NOT NULL,
  `is_pickup_enabled` tinyint(1) NOT NULL,
  `is_premium` tinyint(1) NOT NULL,
  `is_preorder_enabled` tinyint(1) NOT NULL,
  `is_replacement_dish_enabled` tinyint(1) NOT NULL,
  `is_service_fee_enabled` tinyint(1) NOT NULL,
  `is_service_tax_enabled` tinyint(1) NOT NULL,
  `is_service_tax_visible` tinyint(1) NOT NULL,
  `is_test` tinyint(1) NOT NULL,
  `is_vat_disabled` tinyint(1) NOT NULL,
  `is_vat_included_in_product_price` tinyint(1) NOT NULL,
  `is_vat_visible` tinyint(1) NOT NULL,
  `is_voucher_enabled` tinyint(1) NOT NULL,
  `is_promoted` tinyint(1) NOT NULL,
  `is_meal_for_one_vendor` tinyint(1) NOT NULL,
  `is_preferred_partner` tinyint(1) NOT NULL,
  `chain_code` text DEFAULT NULL,
  `chain_main_vendor_code` text DEFAULT NULL,
  `chain_url_key` text DEFAULT NULL,
  `metadata_has_discount` tinyint(1) NOT NULL,
  `timezone` text NOT NULL,
  `metadata_available_in` text DEFAULT NULL,
  `metadata_is_delivery_available` tinyint(1) NOT NULL,
  `metadata_is_pickup_available` tinyint(1) NOT NULL,
  `metadata_is_dine_in_available` tinyint(1) NOT NULL,
  `metadata_is_express_delivery_available` tinyint(1) NOT NULL,
  `metadata_is_temporary_closed` tinyint(1) NOT NULL,
  `metadata_is_flood_feature_closed` tinyint(1) NOT NULL,
  `cuisine` text DEFAULT NULL,
  `city_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `pakistanhub`
--

INSERT INTO `pakistanhub` (`id`, `code`, `name`, `chain_name`, `city`, `address`, `hero_image`, `vendor_legal_information_legal_name`, `vendor_legal_information_trade_register_number`, `accepts_instructions`, `address_2`, `budget`, `custom_location_url`, `customer_type`, `delivery_box`, `delivery_fee_type`, `description`, `distance`, `food_characteristics`, `has_delivery_provider`, `hero_listing_image`, `is_new_until`, `premium_position`, `latitude`, `logo`, `longitude`, `loyalty_percentage_amount`, `loyalty_program_enabled`, `maximum_express_order_amount`, `minimum_delivery_fee`, `minimum_delivery_time`, `minimum_order_amount`, `minimum_pickup_time`, `zip`, `primary_cuisine_id`, `rating`, `redirection_url`, `review_count`, `review_with_comment_number`, `score`, `service_fee_percentage_amount`, `service_tax_percentage_amount`, `tag`, `url_key`, `vat_percentage_amount`, `vendor_points`, `vertical`, `vertical_segment`, `vertical_parent`, `web_path`, `website`, `has_online_payment`, `phone`, `delivery_provider`, `is_active`, `is_best_in_city`, `is_checkout_comment_enabled`, `is_delivery_enabled`, `is_new`, `is_pickup_enabled`, `is_premium`, `is_preorder_enabled`, `is_replacement_dish_enabled`, `is_service_fee_enabled`, `is_service_tax_enabled`, `is_service_tax_visible`, `is_test`, `is_vat_disabled`, `is_vat_included_in_product_price`, `is_vat_visible`, `is_voucher_enabled`, `is_promoted`, `is_meal_for_one_vendor`, `is_preferred_partner`, `chain_code`, `chain_main_vendor_code`, `chain_url_key`, `metadata_has_discount`, `timezone`, `metadata_available_in`, `metadata_is_delivery_available`, `metadata_is_pickup_available`, `metadata_is_dine_in_available`, `metadata_is_express_delivery_available`, `metadata_is_temporary_closed`, `metadata_is_flood_feature_closed`, `cuisine`, `city_id`) VALUES
(101522, 'p8z1', 'The Farm Bakers - VD', 'The Farm Bakers - VD', 'hyderabad', 'Mehran Arcade Phase-1 Sindh University Employee Housing Society, Jamshoro.', 'https://images.deliveryhero.io/image/fd-pk/LH/p8z1-listing.jpg', 'Ali Raza', '+9234******28', 1, NULL, 3, NULL, 'all', NULL, 'amount', NULL, 8.28413292, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/p8z1-listing.jpg', '2024-04-29T10:38:00Z', 0, 25.408758, NULL, 68.2688118, 0, 0, 0, 0, 0, 0, 15, '76060', 77, 0, 'https://foodpanda.pk/restaurant/p8z1/the-farm-bakers-vd', 0, 0, 0, 0, 0, NULL, 'the-farm-bakers-vd', 0, 0, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/p8z1/the-farm-bakers-vd', NULL, 1, '+9234******28', 'vendor_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 'cb2fe', 'p8z1', 'the-farm-bakers-vd', 0, 'Asia/Karachi', '2025-11-09T22:14:11+0500', 0, 1, 0, 0, 0, 0, 'Cakes & Bakery, Desserts', 58625),
(109219, 'tbta', 'Desi Buzz', NULL, 'hyderabad', 'Momin Nagar, Alamdar House c5', 'https://images.deliveryhero.io/image/fd-pk/LH/tbta-listing.jpg', 'FARAH', '+9232******01', 1, NULL, 1, NULL, 'all', NULL, 'amount', NULL, 1.58865222, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/tbta-listing.jpg', '2025-02-18T05:27:00Z', 0, 25.4052591, NULL, 68.3415665, 0, 0, 0, 0, 0, 0, 15, '71000', 85, 0, 'https://foodpanda.pk/restaurant/tbta/desi-buzz', 0, 0, 0, 0, 0, 'Free delivery', 'desi-buzz', 0, 0, 'restaurants', 'home_based_kitchen', 'Restaurant', 'https://foodpanda.pk/restaurant/tbta/desi-buzz', NULL, 1, '+9232******01', 'platform_delivery', 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 0, 'Asia/Karachi', '2025-11-09T21:02:23+0500', 0, 0, 0, 0, 0, 0, 'Beverages, Burgers, Western', 58625),
(115138, 'crs4', 'CHACHA PIRU - Thandi Sarak', NULL, 'hyderabad', 'Inside Max Bachat, Main Thandi Sarak, Near Indus Hotel, Hyd.', 'https://images.deliveryhero.io/image/fd-pk/LH/crs4-listing.jpg', 'Abdul Basit', '+9231******55', 1, NULL, 0, NULL, 'all', NULL, 'amount', NULL, 1.9024221, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/crs4-listing.jpg', '2025-08-28T00:00:00Z', 0, 25.37986753, NULL, 68.33703025, 0, 0, 0, 0, 0, 0, 15, '71000', 139, 2.8, 'https://foodpanda.pk/restaurant/crs4/chacha-piru-thandi-sarak', 26, 0, 0, 0, 0, '10% off', 'chacha-piru-thandi-sarak', 0, 14987, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/crs4/chacha-piru-thandi-sarak', NULL, 1, '+9231******55', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 1, 'Asia/Karachi', '2025-11-09T20:50:43+0500', 0, 1, 0, 0, 0, 0, 'Beverages, Savouries, Pakistani, Tea & Coffee', 58625),
(103244, 'oi0l', 'Crunchy Manchi (FB Area Branch)', 'Crunchy Manchi (FB Area Branch)', 'hyderabad', 'Plot # A-25, Sindh university employees housing society phase 1 Jamshoro', 'https://images.deliveryhero.io/image/fd-pk/LH/oi0l-listing.jpg', 'Syed Toaha Moin', '+9233******86', 1, NULL, 3, NULL, 'all', NULL, 'amount', NULL, 8.20757371, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/oi0l-listing.jpg', '2024-07-14T10:34:23Z', 0, 25.4096363, NULL, 68.2698129, 0, 0, 0, 0, 0, 0, 15, '74600', 86, 4.9, 'https://foodpanda.pk/restaurant/oi0l/crunchy-manchi-fb-area-branch', 33, 0, 0, 0, 0, NULL, 'crunchy-manchi-fb-area-branch', 0, 0, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/oi0l/crunchy-manchi-fb-area-branch', NULL, 1, '+9233******86', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 'cz4uv', 'oi0l', 'crunchy-manchi-fb-area-branch', 0, 'Asia/Karachi', NULL, 1, 1, 0, 0, 0, 0, 'Western, Fast Food', 58625),
(137433, 'xdv3', 'Mardan Pyala Hotel - Zealpak', NULL, 'hyderabad', 'Near Zealpak cricket ground, Block C, Gulshan-e-Zealpak Market, TM Khan Road.', 'https://images.deliveryhero.io/image/fd-pk/LH/xdv3-listing.jpg', 'AADIL NAWAB KHAN', '+9230******98', 1, NULL, 0, NULL, 'all', NULL, 'amount', NULL, 6.52308389, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/xdv3-listing.jpg', '2025-11-22T11:17:33Z', 0, 25.3532271, NULL, 68.3972717, 0, 0, 0, 0, 0, 0, 15, '71000', 139, 0, 'https://foodpanda.pk/restaurant/xdv3/mardan-pyala-hotel-zealpak', 0, 0, 0, 0, 0, '10% off', 'mardan-pyala-hotel-zealpak', 0, 7881, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/xdv3/mardan-pyala-hotel-zealpak', NULL, 1, '+9230******98', 'platform_delivery', 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 1, 'Asia/Karachi', NULL, 1, 1, 0, 0, 0, 0, 'Pakistani, Tea & Coffee, Karahi & Handi', 58625),
(113906, 'eb6o', 'MAMA PIRU - GARRISON', NULL, 'hyderabad', 'Food court, Garrison complex, opposite cantonment board, Saddar.', 'https://images.deliveryhero.io/image/fd-pk/LH/eb6o-listing.jpg', 'MUHAMMAD UMER', '+9230******03', 1, NULL, 2, NULL, 'all', NULL, 'amount', NULL, 1.3575233800000002, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/eb6o-listing.jpg', '2025-07-28T00:00:00Z', 0, 25.388175, NULL, 68.36187, 0, 0, 0, 0, 0, 0, 15, '71000', 86, 3.5, 'https://foodpanda.pk/restaurant/eb6o/mama-piru-garrison', 17, 0, 0, 0, 0, NULL, 'mama-piru-garrison', 0, 14778, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/eb6o/mama-piru-garrison', NULL, 1, '+9230******03', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 0, 'Asia/Karachi', '2025-11-09T20:40:49+0500', 0, 1, 0, 0, 0, 0, 'BBQ, Sandwiches, Burgers, Western, Fast Food', 58625),
(131332, 'u953', 'CHACHA PIRU - ISRA VILLAGE', NULL, 'hyderabad', 'Marhaba supermarket, Isra Village, Hala Naka.', 'https://images.deliveryhero.io/image/fd-pk/LH/u953-listing.jpg', 'Abdul Basit', '+9231******55', 1, NULL, 0, NULL, 'all', NULL, 'amount', NULL, 5.88109646, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/u953-listing.jpg', '2025-10-25T14:05:37Z', 0, 25.4393247, NULL, 68.3773083, 0, 0, 0, 0, 0, 0, 15, '71000', 139, 0, 'https://foodpanda.pk/restaurant/u953/chacha-piru-isra-village', 0, 0, 0, 0, 0, NULL, 'chacha-piru-isra-village', 0, 9711, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/u953/chacha-piru-isra-village', NULL, 1, '+9231******55', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 0, 'Asia/Karachi', '2025-11-06T14:00:00+0500', 0, 1, 0, 0, 0, 0, 'Savouries, Pakistani, Tea & Coffee', 58625),
(111858, 'gpua', 'Food Naka - Hala Naka', NULL, 'hyderabad', 'Shop No, 1 and 2, MAS TAJ 74 Petrol Pump, Hala Naka Road, Beside Isra University, Heerabad.', 'https://images.deliveryhero.io/image/fd-pk/LH/gpua-listing.jpg', 'REHAN S/O MUHAMMAD TARIQ RAJPUT', '+9232******01', 1, NULL, 1, NULL, 'all', NULL, 'amount', NULL, 5.1050164, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/gpua-listing.jpg', '2025-05-29T00:00:00Z', 0, 25.428582, NULL, 68.381278, 0, 0, 0, 0, 0, 0, 15, '71000', 86, 0, 'https://foodpanda.pk/restaurant/gpua/food-naka-hala-naka', 0, 0, 0, 0, 0, NULL, 'food-naka-hala-naka', 0, 0, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/gpua/food-naka-hala-naka', NULL, 1, '+9232******01', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, NULL, NULL, NULL, 0, 'Asia/Karachi', '2025-11-06T11:00:00+0500', 0, 1, 0, 0, 0, 0, 'Steak, Sandwiches, Burgers, Western, Fast Food, Broast', 58625),
(105975, 'e22m', 'E-Food', 'E-Food', 'hyderabad', 'shop no.5, greenhill view appartment, gulshan-e-Quaid, phase 1, Kohsar.', 'https://images.deliveryhero.io/image/fd-pk/LH/e22m-listing.jpg', 'ERIC', '+9231******43', 1, NULL, 2, NULL, 'all', NULL, 'amount', NULL, 7.21353767, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/e22m-listing.jpg', '2024-11-13T08:31:00Z', 0, 25.3288144, NULL, 68.3609625, 0, 0, 0, 0, 0, 0, 15, '17000', 86, 0, 'https://foodpanda.pk/restaurant/e22m/e-food', 0, 0, 0, 0, 0, NULL, 'e-food', 0, 0, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/e22m/e-food', NULL, 1, '+9231******43', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 'cv5gc', 'e22m', 'e-food', 0, 'Asia/Karachi', '2025-11-06T18:00:00+0500', 0, 1, 0, 0, 0, 0, 'Beverages, Pasta, Pizza, Fast Food', 58625),
(10772, 't6tf', '2kay Juice Faluda & Ice Bar', '2kay Juice Faluda & Ice Bar', 'hyderabad', 'Main Autobhan Road, near Lal qila Hyderabad-', 'https://images.deliveryhero.io/image/fd-pk/LH/t6tf-listing.jpg', 'SALMAN ILYAS', NULL, 1, 'Main Autobhan Road, near Lal qila Hyderabad-', 1, NULL, 'all', NULL, 'amount', NULL, 1.95435493, '[]', 1, 'https://images.deliveryhero.io/image/fd-pk/LH/t6tf-listing.jpg', '2022-12-30T00:00:00Z', 0, 25.3755322, NULL, 68.3459798, 0, 0, 0, 0, 0, 0, 20, '71800', 133, 4.8, 'https://foodpanda.pk/restaurant/t6tf/2kay-juice-faluda-and-ice-bar', 1679, 0, 0, 0, 0, '10% off Rs.199', '2kay-juice-faluda-and-ice-bar', 0, 12729, 'restaurants', 'restaurants', 'Restaurant', 'https://foodpanda.pk/restaurant/t6tf/2kay-juice-faluda-and-ice-bar', NULL, 1, '+9233******32', 'platform_delivery', 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 'cr7fm', 't6tf', '2kay-juice-faluda-and-ice-bar', 1, 'Asia/Karachi', NULL, 1, 1, 0, 0, 0, 0, 'Beverages, Healthy Food', 58625);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `pakistanhub`
--
ALTER TABLE `pakistanhub`
  ADD PRIMARY KEY (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
